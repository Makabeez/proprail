// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Script, console } from "forge-std/Script.sol";
import { PayoutEscrow } from "../src/PayoutEscrow.sol";

/**
 * @notice Deploys PayoutEscrow to Arc Testnet.
 *
 * Required env vars:
 *   PRIVATE_KEY                  deployer key
 *   USDC_ARC_TESTNET             0x3600000000000000000000000000000000000000
 *   CCTP_TOKEN_MESSENGER_V2_ARC  0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA
 *   OWNER_ADDRESS                optional; defaults to deployer
 *
 * Run:
 *   source .env
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url $ARC_RPC_URL \
 *     --broadcast \
 *     -vvv
 */
contract Deploy is Script {
    function run() external returns (PayoutEscrow escrow) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address usdc = vm.envAddress("USDC_ARC_TESTNET");
        address cctp = vm.envAddress("CCTP_TOKEN_MESSENGER_V2_ARC");
        address owner = vm.envOr("OWNER_ADDRESS", deployer);

        console.log("==========================================");
        console.log("PropRail PayoutEscrow - Arc Testnet deploy");
        console.log("==========================================");
        console.log("Deployer:       ", deployer);
        console.log("USDC:           ", usdc);
        console.log("CCTP V2:        ", cctp);
        console.log("Contract owner: ", owner);
        console.log("==========================================");

        vm.startBroadcast(deployerKey);
        escrow = new PayoutEscrow(usdc, cctp, owner);
        vm.stopBroadcast();

        console.log("");
        console.log(">>> PayoutEscrow deployed at:", address(escrow));
        console.log("");
        console.log("Next steps:");
        console.log("  1. Copy into frontend .env.local as NEXT_PUBLIC_PAYOUT_ESCROW_ADDRESS");
        console.log("  2. Verify on ArcScan: https://testnet.arcscan.app/address/<address>");
    }
}
