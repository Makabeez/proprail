// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Test } from "forge-std/Test.sol";
import { PayoutEscrow } from "../src/PayoutEscrow.sol";
import { MockUSDC } from "./mocks/MockUSDC.sol";
import { MockTokenMessengerV2 } from "./mocks/MockTokenMessengerV2.sol";

contract PayoutEscrowTest is Test {
    PayoutEscrow escrow;
    MockUSDC usdc;
    MockTokenMessengerV2 cctp;

    address owner = makeAddr("owner");
    address trader = makeAddr("trader");
    address stranger = makeAddr("stranger");

    bytes32 constant REF_1 = bytes32(uint256(0xABCD1234));
    uint32 constant BASE_DOMAIN = 6;

    function setUp() public {
        usdc = new MockUSDC();
        cctp = new MockTokenMessengerV2();
        escrow = new PayoutEscrow(address(usdc), address(cctp), owner);
        usdc.mint(owner, 10_000e6);
    }

    function test_depositTreasury_emitsEventAndUpdatesBalance() public {
        vm.startPrank(owner);
        usdc.approve(address(escrow), 1_000e6);

        vm.expectEmit(true, false, false, true);
        emit PayoutEscrow.TreasuryDeposited(owner, 1_000e6);
        escrow.depositTreasury(1_000e6);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(escrow)), 1_000e6);
        assertEq(escrow.unallocatedBalance(), 1_000e6);
    }

    function test_depositTreasury_revertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        escrow.depositTreasury(100e6);
    }

    function test_depositTreasury_revertsOnZero() public {
        vm.prank(owner);
        vm.expectRevert(PayoutEscrow.ZeroAmount.selector);
        escrow.depositTreasury(0);
    }

    function test_withdrawTreasury_onlyUnallocated() public {
        _fundTreasury(1_000e6);
        _createPayout(trader, 400e6, _futureExpiry());

        vm.prank(owner);
        vm.expectRevert(PayoutEscrow.InsufficientUnallocatedBalance.selector);
        escrow.withdrawTreasury(700e6);

        vm.prank(owner);
        escrow.withdrawTreasury(500e6);
        assertEq(usdc.balanceOf(address(escrow)), 500e6);
    }

    function test_createPayout_happyPath() public {
        _fundTreasury(1_000e6);

        vm.prank(owner);
        uint256 id = escrow.createPayout(trader, 500e6, REF_1, _futureExpiry());

        assertEq(id, 1);
        assertEq(escrow.committed(), 500e6);
        assertEq(escrow.unallocatedBalance(), 500e6);

        PayoutEscrow.Payout memory p = escrow.getPayout(id);
        assertEq(p.trader, trader);
        assertEq(p.amount, 500e6);
        assertEq(p.referenceId, REF_1);
        assertEq(uint256(p.status), uint256(PayoutEscrow.PayoutStatus.Pending));
    }

    function test_createPayout_revertsIfAmountExceedsUnallocated() public {
        _fundTreasury(1_000e6);
        vm.prank(owner);
        vm.expectRevert(PayoutEscrow.InsufficientUnallocatedBalance.selector);
        escrow.createPayout(trader, 1_001e6, REF_1, _futureExpiry());
    }

    function test_createPayout_revertsIfExpiryInPast() public {
        _fundTreasury(1_000e6);
        vm.prank(owner);
        vm.expectRevert(PayoutEscrow.ExpiryInPast.selector);
        escrow.createPayout(trader, 100e6, REF_1, uint64(block.timestamp));
    }

    function test_createPayout_revertsForNonOwner() public {
        _fundTreasury(1_000e6);
        vm.prank(stranger);
        vm.expectRevert();
        escrow.createPayout(trader, 100e6, REF_1, _futureExpiry());
    }

    function test_createPayoutBatch_createsSequentialIds() public {
        _fundTreasury(1_000e6);

        PayoutEscrow.PayoutRequest[] memory reqs = new PayoutEscrow.PayoutRequest[](3);
        reqs[0] = PayoutEscrow.PayoutRequest(trader, 100e6, REF_1, _futureExpiry());
        reqs[1] = PayoutEscrow.PayoutRequest(trader, 200e6, REF_1, _futureExpiry());
        reqs[2] = PayoutEscrow.PayoutRequest(trader, 300e6, REF_1, _futureExpiry());

        vm.prank(owner);
        uint256[] memory ids = escrow.createPayoutBatch(reqs);

        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
        assertEq(ids[2], 3);
        assertEq(escrow.committed(), 600e6);
    }

    function test_claim_happyPath_callsCCTPWithCorrectArgs() public {
        _fundTreasury(1_000e6);
        uint256 id = _createPayout(trader, 500e6, _futureExpiry());

        bytes32 recipient = bytes32(uint256(uint160(trader)));

        vm.prank(trader);
        escrow.claim(id, BASE_DOMAIN, recipient, 1e6, 1000);

        PayoutEscrow.Payout memory p = escrow.getPayout(id);
        assertEq(uint256(p.status), uint256(PayoutEscrow.PayoutStatus.Claimed));
        assertEq(escrow.committed(), 0);

        assertEq(cctp.lastAmount(), 500e6);
        assertEq(cctp.lastDestinationDomain(), BASE_DOMAIN);
        assertEq(cctp.lastMintRecipient(), recipient);
        assertEq(cctp.lastBurnToken(), address(usdc));
        assertEq(cctp.lastDestinationCaller(), bytes32(0));
        assertEq(cctp.lastMaxFee(), 1e6);
        assertEq(cctp.lastMinFinalityThreshold(), 1000);

        assertEq(usdc.balanceOf(address(escrow)), 500e6);
        assertEq(usdc.balanceOf(address(cctp)), 500e6);
    }

    function test_claim_revertsForNonTrader() public {
        _fundTreasury(1_000e6);
        uint256 id = _createPayout(trader, 500e6, _futureExpiry());

        vm.prank(stranger);
        vm.expectRevert(PayoutEscrow.NotTheTrader.selector);
        escrow.claim(id, BASE_DOMAIN, bytes32(uint256(1)), 0, 1000);
    }

    function test_claim_revertsOnDoubleClaim() public {
        _fundTreasury(1_000e6);
        uint256 id = _createPayout(trader, 500e6, _futureExpiry());
        bytes32 recipient = bytes32(uint256(uint160(trader)));

        vm.prank(trader);
        escrow.claim(id, BASE_DOMAIN, recipient, 0, 1000);

        vm.prank(trader);
        vm.expectRevert(PayoutEscrow.PayoutNotPending.selector);
        escrow.claim(id, BASE_DOMAIN, recipient, 0, 1000);
    }

    function test_claim_revertsForNonExistentPayout() public {
        vm.prank(trader);
        vm.expectRevert(PayoutEscrow.PayoutNotFound.selector);
        escrow.claim(999, BASE_DOMAIN, bytes32(0), 0, 1000);
    }

    function test_cancel_revertsBeforeExpiry() public {
        _fundTreasury(1_000e6);
        uint256 id = _createPayout(trader, 500e6, _futureExpiry());

        vm.prank(owner);
        vm.expectRevert(PayoutEscrow.PayoutNotExpired.selector);
        escrow.cancel(id);
    }

    function test_cancel_succeedsAfterExpiry_releasesCommitment() public {
        _fundTreasury(1_000e6);
        uint64 exp = uint64(block.timestamp + 1 days);
        uint256 id;

        vm.prank(owner);
        id = escrow.createPayout(trader, 500e6, REF_1, exp);

        vm.warp(exp + 1);

        vm.prank(owner);
        escrow.cancel(id);

        assertEq(escrow.committed(), 0);
        assertEq(escrow.unallocatedBalance(), 1_000e6);

        PayoutEscrow.Payout memory p = escrow.getPayout(id);
        assertEq(uint256(p.status), uint256(PayoutEscrow.PayoutStatus.Cancelled));
    }

    function test_cancel_revertsForNonOwner() public {
        _fundTreasury(1_000e6);
        uint64 exp = uint64(block.timestamp + 1 days);

        vm.prank(owner);
        uint256 id = escrow.createPayout(trader, 500e6, REF_1, exp);

        vm.warp(exp + 1);
        vm.prank(stranger);
        vm.expectRevert();
        escrow.cancel(id);
    }

    function _fundTreasury(uint256 amount) internal {
        vm.startPrank(owner);
        usdc.approve(address(escrow), amount);
        escrow.depositTreasury(amount);
        vm.stopPrank();
    }

    function _createPayout(address t, uint256 amount, uint64 expiry)
        internal
        returns (uint256 id)
    {
        vm.prank(owner);
        id = escrow.createPayout(t, amount, REF_1, expiry);
    }

    function _futureExpiry() internal view returns (uint64) {
        return uint64(block.timestamp + 7 days);
    }
}
