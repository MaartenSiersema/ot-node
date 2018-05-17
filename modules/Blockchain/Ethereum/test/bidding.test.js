const { assert, expect } = require('chai');

var TestingUtilities = artifacts.require('./TestingUtilities.sol'); // eslint-disable-line no-undef
var TracToken = artifacts.require('./TracToken.sol'); // eslint-disable-line no-undef
var EscrowHolder = artifacts.require('./EscrowHolder.sol'); // eslint-disable-line no-undef
var Bidding = artifacts.require('./BiddingTest.sol'); // eslint-disable-line no-undef

var Web3 = require('web3');

// Constant values
const escrowDuration = 20;
const one_ether = '1000000000000000000';
var DC_wallet;
var node_id = [];
const data_id = 20;
var escrow_address;
var bidding_address;
var offer_hash;

// eslint-disable-next-line no-undef
contract('Bidding testing', async (accounts) => {
    // eslint-disable-next-line no-undef
    it('Should get TracToken contract', async () => {
        await TracToken.deployed().then((res) => {
            console.log(`\t Bidding address: ${res.address}`);
        }).catch(err => console.log(err));
    });

    // eslint-disable-next-line no-undef
    it('Should get Escrow contract', async () => {
        await EscrowHolder.deployed().then((res) => {
            escrow_address = res.address;
        }).catch(err => console.log(err));
        console.log(`\t Escrow address: ${escrow_address}`);
    });

    // eslint-disable-next-line no-undef
    it('Should get Bidding contract', async () => {
        await Bidding.deployed().then((res) => {
            bidding_address = res.address;
        }).catch(err => console.log(err));
        console.log(`\t Bidding address: ${bidding_address}`);
    });

    // eslint-disable-next-line no-undef
    it('Should get TestingUtilities contract', async () => {
        await TestingUtilities.deployed().then((res) => {
            console.log(`\t Bidding address: ${res.address}`);
        }).catch(err => console.log(err));
    });

    DC_wallet = accounts[0]; // eslint-disable-line prefer-destructuring

    // eslint-disable-next-line no-undef
    it('Should mint 5e25 (accounts 0 - 9)', async () => {
        const trace = await TracToken.deployed();
        const amount = 5e25;
        for (var i = 9; i >= 0; i -= 1) {
            // eslint-disable-next-line no-await-in-loop
            await trace.mint(accounts[i], amount);
        }
        await trace.endMinting();

        const response = await trace.balanceOf.call(accounts[0]);
        const actual_balance = response.toNumber();
        console.log(`\t balance: ${actual_balance}`);

        assert.equal(actual_balance, amount, 'balance not 5e25');
    });

    // eslint-disable-next-line no-undef
    it('Should make node_id for every profile (as keccak256(wallet_address))', async () => {
        const testUtils = await TestingUtilities.deployed();
        for (var i = 0; i < 10; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const response = await testUtils.keccakSender({ from: accounts[i] });
            node_id.push(response);
            console.log(`node_id ${i} : ${node_id[i]}`);
        }
    });

    // eslint-disable-next-line no-undef
    it('Should create 10 bidding profiles', async () => {
        const escrow = await EscrowHolder.deployed();
        const bidding = await Bidding.deployed();
        const trace = await TracToken.deployed();
        for (var i = node_id.length - 1; i >= 0; i -= 1) {
            // eslint-disable-next-line no-await-in-loop
            await trace.increaseApproval(bidding_address, 1e23, { from: node_id[i] });
        }

        const response = await trace.allowance.call(DC_wallet, bidding.address);
        const allowance_DC = response.toNumber();
        console.log(`\t allowance_DC: ${allowance_DC}`);

        assert.equal(allowance_DC, 100000000, 'The proper amount was not allowed');
    });

    // eslint-disable-next-line no-undef
    it('Should create escrow offer, with acc[1] and [2] as predetermined', async () => {
        const bidding = await Bidding.deployed();
        const trace = await TracToken.deployed();
        const util = await TestingUtilities.deployed();

        const predetermined_wallet = [];
        predetermined_wallet.push(accounts[1]);
        predetermined_wallet.push(accounts[2]);
        const predetermined_node_id = [];
        predetermined_node_id.push(node_id[1]);
        predetermined_node_id.push(node_id[2]);

        // Offer variables
        const total_escrow_time = 60;
        const max_token_amount = 1000e18;
        const min_stake_amount = 10e18;
        const min_reputation = 0;

        // Data holding parameters
        const data_hash = util.keccakAddressBytes(accounts[6], node_id[6]);
        const data_size = 1;

        console.log(`\t Data hash ${data_hash}`);

        offer_hash = await util.keccak3(accounts[0], node_id[0], data_id);
        console.log(`\t offer_hash: ${offer_hash}`);

        await bidding.createOffer(
            0, // data_id
            node_id[0],

            total_escrow_time,
            max_token_amount,
            min_stake_amount,
            min_reputation,

            data_hash,
            data_size,

            predetermined_wallet,
            predetermined_node_id,
            { from: DC_wallet });// eslint-disable-line function-paren-newline

        response = await bidding.offer.call(offer_hash);

        const actual_DC_wallet = response[0];

        console.log(`\t DC_wallet: ${actual_DC_wallet}`);

        let actual_max_token = response[1];
        actual_max_token = actual_max_token.toNumber();
        console.log(`\t actual_max_token: ${actual_max_token}`);

        let actual_min_stake = response[2];
        actual_min_stake = actual_min_stake.toNumber();
        console.log(`\t actual_min_stake: ${actual_min_stake}`);

        let actual_min_reputation = response[3];
        actual_min_reputation = actual_min_reputation.toNumber();
        console.log(`\t actual_min_reputation: ${actual_min_reputation}`);

        let actual_escrow_time = response[4];
        actual_escrow_time = actual_escrow_time.toNumber();
        console.log(`\t actual_escrow_time: ${actual_escrow_time}`);

        let replication_factor = response[8];
        replication_factor = replication_factor.toNumber();
        console.log(`\t replication_factor: ${replication_factor}`);

        console.log('\n\nUKLJUCI UZIMANJE TOKENA NA SC KADA SE UBACI DEPOSIT TOKEN\n\n');

        assert.equal(actual_DC_wallet, DC_wallet, 'DC_wallet not matching');
        assert.equal(actual_max_token, max_token_amount, 'max_token_amount not matching');
        assert.equal(actual_min_stake, min_stake_amount, 'min_stake_amount not matching');
        assert.equal(actual_min_reputation, min_reputation, 'min_reputation not matching');
        assert.equal(actual_escrow_time, total_escrow_time, 'total_escrow_time not matching');
        assert.equal(replication_factor, 2, 'replication_factor not matching');
    });

    // createProfile(bytes32 node_id, uint price, uint stake, uint max_time, uint max_size)
    // 0: uint256: token_amount
    // 1: uint256: stake_amount
    // 2: uint256: balance
    // 3: uint256: reputation
    // 4: uint256: max_escrow_time
    // 5: uint256: size_available
    it('Should create 10 profiles', async () => {
        const bidding = await Bidding.deployed();
        const token_amount = [];
        const stake_amount = [];
        for (let i = 0; i < 10; i++) {
            console.log(`Creating profile ${node_id[i]}`);
            token_amount[i] = Math.round(Math.random() * 1000);
            stake_amount[i] = Math.round(Math.random() * 10000);
            bidding.createProfile(node_id[i], token_amount[i], stake_amount[i], 1, 1, { from: accounts[i] });
        }

        const response = bidding.profile.call(accounts[0]);
        console.log(JSON.stringify(response));

/*        const response = [];
        for (let i = 0; i < 10; i++) {
            response[i] = bidding.profile.call(accounts[i]);
            console.log(JSON.stringify(response[i]));
        }*/

        // await Promise.all(response);

        assert.equal(response[0].toNumber(), token_amount[0], 'Price not matching');
        assert.equal(response[1].toNumber(), stake_amount[0], 'Stake not matching');

        //const tokenInstance = await TracToken.deployed();



    });
    // // eslint-disable-next-line no-undef
    // it('Should try to get a bid', async () => {
    //     const bidding = await Bidding.deployed();
    //     const trace = await TracToken.deployed();
    //     const util = await TestingUtilities.deployed();

    //     const response = await bidding.offer.call(offer_hash);
    //     console.log(`response: ${response}`);
    // });

    // eslint-disable-next-line no-undef
    it('Should get a bid index of accounts[2]', async () => {
        const bidding = await Bidding.deployed();

        var actual_index =
        await bidding.getBidIndex(offer_hash, node_id[2], { from: accounts[2] });
        actual_index = actual_index.toNumber();

        assert.equal(actual_index, 1, 'Bid index not equal 1');
    });

    // TODO Ovo ukljuci kada se naprave profili
    // // eslint-disable-next-line no-undef
    // it('Should activate predetermined bid for acc[2]', async () => {
    //     const bidding = await Bidding.deployed();
    //     const trace = await TracToken.deployed();
    //     const util = await TestingUtilities.deployed();

    //     await bidding.activatePredeterminedBid(offer_hash, node_id[2], 1, { from: accounts[2] });
    // });

    // TODO I ovo ukljuvi kada se naprave profili i doda deposit token
    // // eslint-disable-next-line no-undef
    // it('Should add 7 more bids', async () => {
    //     const bidding = await Bidding.deployed();
    //     const util = await TestingUtilities.deployed();

    //     for (var i = 3; i < 10; i += 1) {
    //         console.log('\n\nUKLJUCI UZIMANJE TOKENA NA SC KADA SE UBACI DEPOSIT TOKEN\n\n');
    //         // eslint-disable-next-line no-await-in-loop
    //         await bidding.addBid(offer_hash, node_id[i], { from: accounts[i] });
    //     }

    //     var response = await bidding.offer.call(offer_hash);
    //     const first_bid_index = response.toNumber();
    //     console.log(`first_bid_index =  ${first_bid_index}`);

    //     assert.equal(first_bid_index, 5, 'Something wrong');
    // });

/*
    // eslint-disable-next-line no-undef
    it('Should create an Escrow, lasting 20 blocks, valued 100000000 trace', async () => {
        const instance = await EscrowHolder.deployed();
        const util = await TestingUtilities.deployed();

        let response = await util.getBlockNumber.call();

        await instance.initiateEscrow(
            DC_wallet,
            accounts[1],
            data_id,
            100000000,
            100000000,
            escrowDuration,
            { from: DC_wallet },
        ).then((result) => {
            console.log(`\t Initiate escrow - Gas used : ${result.receipt.gasUsed}`);
        });

        response = await instance.escrow.call(DC_wallet, accounts[1], data_id);


        let token_amount = response[0];
        token_amount = token_amount.toNumber();

        let tokens_sent = response[1];
        tokens_sent = tokens_sent.toNumber();

        let stake_amount = response[2];
        stake_amount = stake_amount.toNumber();

        let actual_startTime = response[3];
        actual_startTime = actual_startTime.toNumber();

        let endTime = response[4];
        endTime = endTime.toNumber();

        let total_time = response[5];
        total_time = total_time.toNumber();

        let status = response[6];
        status = status.toNumber();
        switch (status) {
        case 0:
            status = 'initated';
            break;
        case 1:
            status = 'verified';
            break;
        case 2:
            status = 'canceled';
            break;
        case 3:
            status = 'completed';
            break;
        default:
            status = 'err';
            break;
        }

        console.log('Escrow values: ');
        console.log(`\t token_amount: ${token_amount}`);
        console.log(`\t tokens_sent: ${tokens_sent}`);
        console.log(`\t stake_amount: ${stake_amount}`);
        console.log(`\t start_time: ${actual_startTime}`);
        console.log(`\t end_time: ${endTime}`);
        console.log(`\t total_time: ${total_time}`);
        console.log(`\t status: ${status}`);


        assert.equal(token_amount, 100000000, 'Amount of tokens does not match!');
        assert.equal(tokens_sent, 0, 'Sent tokens not equal zero!');
        // eslint-disable-next-line no-undef
        assert.equal(stake_amount, 100000000, 'Stake amount does not match!');
        assert.equal(0, actual_startTime, 'Start time not equal zero!');
        assert.equal(0, endTime, 'End time not equal zero!');
        assert.equal(escrowDuration, total_time, 'Escrow duration does not match!');
        assert.equal(status, 'initated', 'Escrow status not initated properly!');
    });

    // eslint-disable-next-line no-undef
    it('Should break - DH verifies escrow with wrong token amount', async () => {
        const instance = await EscrowHolder.deployed();

        let error;
        try {
            await instance.verifyEscrow(
                DC_wallet,
                data_id,
                3 * 100000000,
                100000000,
                escrowDuration,
                { from: accounts[1] },
            ).then((result) => {
                console.log(`\t Verify escrow - Gas used : ${result.receipt.gasUsed}`);
            });
        } catch (e) {
            error = e;
        }

        assert.notEqual(error, undefined, 'Error must be thrown');
        assert.isAbove(error.message.search('Exception while processing transaction: revert'), -1, 'revert error must be returned');
    });

    // eslint-disable-next-line no-undef
    it('Should increase DH-escrow approval before verification', async () => {
        const escrowInstance = await EscrowHolder.deployed();
        const tokenInstance = await TracToken.deployed();

        await tokenInstance.increaseApproval(escrow_address, 100000000, { from: accounts[1] });

        const response = await tokenInstance.allowance.call(accounts[1], escrowInstance.address);
        const allowance_DH = response.toNumber();
        console.log(`\t allowance_DH: ${allowance_DH}`);

        assert.equal(allowance_DH, 100000000, 'The proper amount was not allowed');
    });

    // eslint-disable-next-line no-undef
    it('Should verify an existing escrow', async () => {
        const instance = await EscrowHolder.deployed();

        await instance.verifyEscrow(
            DC_wallet, data_id, 100000000, 100000000, escrowDuration,
            { from: accounts[1] },
        ).then((result) => {
            console.log(`\t Verify escrow - Gas used : ${result.receipt.gasUsed}`);
        });

        const response = await instance.escrow.call(DC_wallet, accounts[1], data_id);
        let status = response[6];
        status = status.toNumber();
        switch (status) {
        case 0:
            status = 'initated';
            break;
        case 1:
            status = 'verified';
            break;
        case 2:
            status = 'canceled';
            break;
        case 3:
            status = 'completed';
            break;
        default:
            status = 'err';
            break;
        }

        console.log(`\t Status: ${status}`);
        assert.equal(status, 'verified', "Escrow wasn't verified");
    });

    */
});
