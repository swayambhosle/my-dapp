// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title YourContract
 * @notice A simple delegate management contract for the Delegate dApp.
 * @dev The owner can assign a delegate address. Only the owner can change the delegate.
 */
contract YourContract {
    address public owner;
    address public delegate;

    event DelegateChanged(address indexed oldDelegate, address indexed newDelegate);

    /**
     * @notice Sets the deployer as both owner and initial delegate.
     * @param _owner The address that will own this contract.
     */
    constructor(address _owner) {
        require(_owner != address(0), "Owner cannot be zero address");
        owner = _owner;
        delegate = _owner;
    }

    /**
     * @notice Updates the delegate address. Only the owner can call this.
     * @param _newDelegate The new delegate address. Cannot be the zero address.
     */
    function setDelegate(address _newDelegate) public {
        require(msg.sender == owner, "Only the owner can change the delegate");
        require(_newDelegate != address(0), "Delegate cannot be zero address");

        address oldDelegate = delegate;
        delegate = _newDelegate;
        emit DelegateChanged(oldDelegate, _newDelegate);
    }
}
