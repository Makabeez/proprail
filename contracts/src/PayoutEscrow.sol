// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { ITokenMessengerV2 } from "./interfaces/ITokenMessengerV2.sol";

/**
 * @title PayoutEscrow
 * @notice USDC payout rail for prop-trading firms. Prop firm (owner) deposits
 *         USDC into this escrow, registers payout obligations to individual
 *         traders, and traders claim them — routing crosschain via CCTP V2.
 * @dev Arc Testnet deployment target. USDC has 6 decimals.
 */
contract PayoutEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum PayoutStatus {
        None,
        Pending,
        Claimed,
        Cancelled
    }

    struct Payout {
        address trader;
        uint256 amount;
        bytes32 referenceId;
        uint64 expiresAt;
        PayoutStatus status;
    }

    struct PayoutRequest {
        address trader;
        uint256 amount;
        bytes32 referenceId;
        uint64 expiresAt;
    }

    IERC20 public immutable usdc;
    ITokenMessengerV2 public immutable cctp;

    uint256 public committed;
    uint256 public nextPayoutId = 1;

    mapping(uint256 => Payout) public payouts;

    event TreasuryDeposited(address indexed from, uint256 amount);
    event TreasuryWithdrawn(address indexed to, uint256 amount);
    event PayoutCreated(
        uint256 indexed payoutId,
        address indexed trader,
        uint256 amount,
        bytes32 indexed referenceId,
        uint64 expiresAt
    );
    event PayoutClaimed(
        uint256 indexed payoutId,
        address indexed trader,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        uint64 cctpNonce
    );
    event PayoutCancelled(uint256 indexed payoutId);

    error ZeroAmount();
    error ZeroAddress();
    error InsufficientUnallocatedBalance();
    error PayoutNotFound();
    error PayoutNotPending();
    error NotTheTrader();
    error PayoutNotExpired();
    error ExpiryInPast();

    constructor(address _usdc, address _cctp, address _owner) Ownable(_owner) {
        if (_usdc == address(0) || _cctp == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }
        usdc = IERC20(_usdc);
        cctp = ITokenMessengerV2(_cctp);
    }

    function depositTreasury(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit TreasuryDeposited(msg.sender, amount);
    }

    function withdrawTreasury(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (amount > unallocatedBalance()) revert InsufficientUnallocatedBalance();
        usdc.safeTransfer(msg.sender, amount);
        emit TreasuryWithdrawn(msg.sender, amount);
    }

    function createPayout(
        address trader,
        uint256 amount,
        bytes32 referenceId,
        uint64 expiresAt
    ) external onlyOwner returns (uint256 payoutId) {
        return _createPayout(trader, amount, referenceId, expiresAt);
    }

    function createPayoutBatch(PayoutRequest[] calldata requests)
        external
        onlyOwner
        returns (uint256[] memory payoutIds)
    {
        uint256 len = requests.length;
        payoutIds = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            payoutIds[i] = _createPayout(
                requests[i].trader,
                requests[i].amount,
                requests[i].referenceId,
                requests[i].expiresAt
            );
        }
    }

    function _createPayout(
        address trader,
        uint256 amount,
        bytes32 referenceId,
        uint64 expiresAt
    ) internal returns (uint256 payoutId) {
        if (trader == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (expiresAt <= block.timestamp) revert ExpiryInPast();
        if (amount > unallocatedBalance()) revert InsufficientUnallocatedBalance();

        payoutId = nextPayoutId++;
        payouts[payoutId] = Payout({
            trader: trader,
            amount: amount,
            referenceId: referenceId,
            expiresAt: expiresAt,
            status: PayoutStatus.Pending
        });

        committed += amount;

        emit PayoutCreated(payoutId, trader, amount, referenceId, expiresAt);
    }

    function claim(
        uint256 payoutId,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external nonReentrant {
        Payout storage p = payouts[payoutId];

        if (p.status == PayoutStatus.None) revert PayoutNotFound();
        if (p.status != PayoutStatus.Pending) revert PayoutNotPending();
        if (msg.sender != p.trader) revert NotTheTrader();

        p.status = PayoutStatus.Claimed;
        committed -= p.amount;

        uint256 amount = p.amount;

        usdc.forceApprove(address(cctp), amount);

        uint64 cctpNonce = cctp.depositForBurn(
            amount,
            destinationDomain,
            mintRecipient,
            address(usdc),
            bytes32(0),
            maxFee,
            minFinalityThreshold
        );

        emit PayoutClaimed(payoutId, p.trader, destinationDomain, mintRecipient, cctpNonce);
    }

    function cancel(uint256 payoutId) external onlyOwner {
        Payout storage p = payouts[payoutId];
        if (p.status == PayoutStatus.None) revert PayoutNotFound();
        if (p.status != PayoutStatus.Pending) revert PayoutNotPending();
        if (block.timestamp < p.expiresAt) revert PayoutNotExpired();

        p.status = PayoutStatus.Cancelled;
        committed -= p.amount;

        emit PayoutCancelled(payoutId);
    }

    function unallocatedBalance() public view returns (uint256) {
        return usdc.balanceOf(address(this)) - committed;
    }

    function getPayout(uint256 payoutId) external view returns (Payout memory) {
        return payouts[payoutId];
    }
}
