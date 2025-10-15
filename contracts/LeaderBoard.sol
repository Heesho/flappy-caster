// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LeaderBoard {
    error Unauthorized();
    error InvalidInput();
    error TransferFailed();

    event TreasuryUpdated(address indexed treasury);
    event AdminUpdated(address indexed admin, bool enabled);
    event CreditPriceUpdated(uint256 price);
    event TreasuryFeeUpdated(uint256 feeBps);
    event CurrentRoundAllocationUpdated(uint256 allocationBps);
    event CreditsPurchased(address indexed player, uint256 amount, uint256 prizeContribution);
    event ContestSettled(address indexed caller, address[] winners, uint256[] prizes, uint256 payoutPool);

    address public owner;
    address payable public treasury;

    mapping(address => bool) public admins;

    uint256 public creditPrice = 1 ether;
    uint256 public treasuryFeeBps = 1000; // 10%
    uint256 public currentRoundAllocationBps = 7000; // 70% of pool distributed daily

    uint256 public prizePool; // Accumulated credits available for distribution

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != owner && !admins[msg.sender]) {
            revert Unauthorized();
        }
        _;
    }

    constructor(address payable _treasury) {
        owner = msg.sender;
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setTreasury(address payable _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setAdmin(address _admin, bool flag) external onlyOwner {
        admins[_admin] = flag;
        emit AdminUpdated(_admin, flag);
    }

    function setCreditPrice(uint256 _price) external onlyOwner {
        if (_price == 0) revert InvalidInput();
        creditPrice = _price;
        emit CreditPriceUpdated(_price);
    }

    function setTreasuryFee(uint256 feeBps) external onlyOwner {
        if (feeBps > 2000) revert InvalidInput();
        treasuryFeeBps = feeBps;
        emit TreasuryFeeUpdated(feeBps);
    }

    function setCurrentRoundAllocation(uint256 allocationBps) external onlyOwner {
        if (allocationBps > 10000) revert InvalidInput();
        currentRoundAllocationBps = allocationBps;
        emit CurrentRoundAllocationUpdated(allocationBps);
    }

    function purchaseCredits(address account, uint256 amount) external payable {
        if (amount == 0 || account == address(0)) revert InvalidInput();
        uint256 totalCost = creditPrice * amount;
        if (msg.value != totalCost) revert InvalidInput();

        uint256 treasuryCut = (totalCost * treasuryFeeBps) / 10_000;
        uint256 poolContribution = totalCost - treasuryCut;
        prizePool += poolContribution;

        (bool sent, ) = treasury.call{value: treasuryCut}("");
        if (!sent) revert TransferFailed();

        emit CreditsPurchased(account, amount, poolContribution);
    }

    function settleContest(address[] calldata winners, uint256[] calldata prizes) external onlyAdmin {
        if (winners.length == 0 || winners.length != prizes.length) revert InvalidInput();
        uint256 payoutPool = (prizePool * currentRoundAllocationBps) / 10_000;
        if (payoutPool == 0) revert InvalidInput();

        uint256 totalPercent;
        for (uint256 i = 0; i < prizes.length; i++) {
            totalPercent += prizes[i];
        }
        if (totalPercent != 100) revert InvalidInput();

        prizePool -= payoutPool;

        for (uint256 i = 0; i < winners.length; i++) {
            address payable winner = payable(winners[i]);
            if (winner == address(0)) revert InvalidInput();
            uint256 payout = (payoutPool * prizes[i]) / 100;
            (bool sent, ) = winner.call{value: payout}("");
            if (!sent) revert TransferFailed();
        }

        emit ContestSettled(msg.sender, winners, prizes, payoutPool);
    }

    receive() external payable {
        prizePool += msg.value;
    }
}
