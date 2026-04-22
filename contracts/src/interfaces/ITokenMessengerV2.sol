// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title ITokenMessengerV2
 * @notice Minimal interface for Circle's CCTP V2 TokenMessenger.
 * @dev PropRail only needs depositForBurn. Source of truth:
 *      https://github.com/circlefin/evm-cctp-contracts
 *
 * CCTP V2 Notes:
 * - minFinalityThreshold: 1000 or lower = Fast Transfer (fee applies)
 *                         2000 = Standard Transfer (slower, may be cheaper)
 * - maxFee is denominated in the burn token's base units (USDC = 6 decimals)
 * - destinationCaller = bytes32(0) means any address can mint on destination
 */
interface ITokenMessengerV2 {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external returns (uint64 nonce);
}
