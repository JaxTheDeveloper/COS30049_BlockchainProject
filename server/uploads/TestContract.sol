// TestContract.sol
pragma solidity ^0.8.0;

contract TestContract {
    address public owner;
    mapping(address => uint256) public balances;
    
    constructor() {
        owner = msg.sender;
    }
    
    // Reentrancy vulnerability
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Vulnerable: sends ETH before updating balance
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount;
    }
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    // Unchecked low-level call
    function transferTo(address payable recipient, uint256 amount) public {
        require(msg.sender == owner, "Only owner");
        recipient.call{value: amount}("");
    }
}