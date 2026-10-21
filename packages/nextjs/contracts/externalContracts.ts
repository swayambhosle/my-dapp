import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const externalContracts = {
  11155111: {
    YourContractLegacy: {
      address: "0xe90a2bb9a8972f5db1c156df1b873ff705515fd4",
      abi: [
        {
          inputs: [
            {
              internalType: "address",
              name: "_owner",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "oldDelegate",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "newDelegate",
              type: "address",
            },
          ],
          name: "DelegateChanged",
          type: "event",
        },
        {
          inputs: [],
          name: "delegate",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "owner",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "_newDelegate",
              type: "address",
            },
          ],
          name: "setDelegate",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      inheritedFunctions: {},
      deployedOnBlock: 11956484,
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
