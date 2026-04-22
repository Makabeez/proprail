export const payoutEscrowAbi = [
  // ============ Views ============
  {
    type: 'function',
    name: 'usdc',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'cctp',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'committed',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'nextPayoutId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'unallocatedBalance',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getPayout',
    stateMutability: 'view',
    inputs: [{ name: 'payoutId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'trader', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'referenceId', type: 'bytes32' },
          { name: 'expiresAt', type: 'uint64' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },

  // ============ Writes (owner) ============
  {
    type: 'function',
    name: 'depositTreasury',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdrawTreasury',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'createPayout',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'trader', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'referenceId', type: 'bytes32' },
      { name: 'expiresAt', type: 'uint64' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'createPayoutBatch',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'requests',
        type: 'tuple[]',
        components: [
          { name: 'trader', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'referenceId', type: 'bytes32' },
          { name: 'expiresAt', type: 'uint64' },
        ],
      },
    ],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'cancel',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'payoutId', type: 'uint256' }],
    outputs: [],
  },

  // ============ Writes (trader) ============
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'payoutId', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
    ],
    outputs: [],
  },

  // ============ Events ============
  {
    type: 'event',
    name: 'TreasuryDeposited',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TreasuryWithdrawn',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PayoutCreated',
    inputs: [
      { name: 'payoutId', type: 'uint256', indexed: true },
      { name: 'trader', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'referenceId', type: 'bytes32', indexed: true },
      { name: 'expiresAt', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PayoutClaimed',
    inputs: [
      { name: 'payoutId', type: 'uint256', indexed: true },
      { name: 'trader', type: 'address', indexed: true },
      { name: 'destinationDomain', type: 'uint32', indexed: false },
      { name: 'mintRecipient', type: 'bytes32', indexed: false },
      { name: 'cctpNonce', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PayoutCancelled',
    inputs: [{ name: 'payoutId', type: 'uint256', indexed: true }],
  },
] as const

export const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const
