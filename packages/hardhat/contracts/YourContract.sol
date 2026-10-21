// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/** @title Delegation and voting for a single owner-authorized delegate. */
contract YourContract {
    address public owner;
    address public delegate;

    struct Proposal {
        string title;
        string description;
        uint256 createdAt;
        uint256 forVotes;
        uint256 againstVotes;
        bool isOpen;
    }

    uint256 public proposalCount;
    mapping(uint256 proposalId => Proposal proposal) private proposals;
    mapping(uint256 proposalId => mapping(address voter => bool)) public hasVoted;

    event DelegateChanged(address indexed oldDelegate, address indexed newDelegate);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalClosed(uint256 indexed proposalId, address indexed closer);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    constructor(address _owner) {
        require(_owner != address(0), "Owner cannot be zero address");
        owner = _owner;
        delegate = _owner;
    }

    function setDelegate(address newDelegate) external onlyOwner {
        require(newDelegate != address(0), "Use revokeDelegation to revoke");
        _setDelegate(newDelegate);
    }

    function revokeDelegation() external onlyOwner {
        _setDelegate(address(0));
    }

    function _setDelegate(address newDelegate) private {
        address oldDelegate = delegate;
        delegate = newDelegate;
        emit DelegateChanged(oldDelegate, newDelegate);
    }

    function createProposal(
        string calldata title,
        string calldata description
    ) external onlyOwner returns (uint256 proposalId) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");

        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({
            title: title,
            description: description,
            createdAt: block.timestamp,
            forVotes: 0,
            againstVotes: 0,
            isOpen: true
        });
        emit ProposalCreated(proposalId, msg.sender, title, description);
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposalId > 0 && proposalId <= proposalCount, "Proposal does not exist");
        require(proposal.isOpen, "Proposal is closed");
        require(delegate != address(0) && msg.sender == delegate, "Only the current delegate can vote");
        require(!hasVoted[proposalId][msg.sender], "Delegate already voted");

        hasVoted[proposalId][msg.sender] = true;
        if (support) proposal.forVotes++;
        else proposal.againstVotes++;
        emit VoteCast(proposalId, msg.sender, support);
    }

    function closeProposal(uint256 proposalId) external onlyOwner {
        require(proposalId > 0 && proposalId <= proposalCount, "Proposal does not exist");
        Proposal storage proposal = proposals[proposalId];
        require(proposal.isOpen, "Proposal is already closed");
        proposal.isOpen = false;
        emit ProposalClosed(proposalId, msg.sender);
    }

    function getProposal(
        uint256 proposalId
    )
        external
        view
        returns (
            string memory title,
            string memory description,
            uint256 createdAt,
            uint256 forVotes,
            uint256 againstVotes,
            bool isOpen
        )
    {
        require(proposalId > 0 && proposalId <= proposalCount, "Proposal does not exist");
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.title,
            proposal.description,
            proposal.createdAt,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.isOpen
        );
    }

    function version() external pure returns (uint256) {
        return 2;
    }
}
