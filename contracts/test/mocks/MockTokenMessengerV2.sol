// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ITokenMessengerV2 } from "../../src/interfaces/ITokenMessengerV2.sol";

/**
 * @notice Mock that records the last depositForBurn call and burns tokens
 *         by pulling them from msg.sender and leaving them in this contract
 *         (real CCTP burns via TokenMinterV2 — for tests, "burn" = "trapped").
 */
contract MockTokenMessengerV2 is ITokenMessengerV2 {
    uint64 public nextNonce = 1;

    uint256 public lastAmount;
    uint32 public lastDestinationDomain;
    bytes32 public lastMintRecipient;
    address public lastBurnToken;
    bytes32 public lastDestinationCaller;
    uint256 public lastMaxFee;
    uint32 public lastMinFinalityThreshold;
    address public lastCaller;

    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external returns (uint64 nonce) {
        IERC20(burnToken).transferFrom(msg.sender, address(this), amount);

        lastAmount = amount;
        lastDestinationDomain = destinationDomain;
        lastMintRecipient = mintRecipient;
        lastBurnToken = burnToken;
        lastDestinationCaller = destinationCaller;
        lastMaxFee = maxFee;
        lastMinFinalityThreshold = minFinalityThreshold;
        lastCaller = msg.sender;

        nonce = nextNonce++;
    }
}
