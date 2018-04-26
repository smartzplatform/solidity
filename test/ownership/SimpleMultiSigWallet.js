'use strict';

// testrpc has to be run as testrpc -u 0 -u 1 -u 2 -u 3

import expectThrow from '../helpers/expectThrow';

const SimpleMultiSigWallet = artifacts.require("./SimpleMultiSigWallet.sol");
const Token = artifacts.require("MintableTokenHelper.sol");
const l = console.log;

contract('SimpleMultiSigWallet', function(accounts) {

    const role = {
        owner1: accounts[0],
        owner2: accounts[1],
        owner3: accounts[2],

        nobody: accounts[3],
        tokenOwner: accounts[7],
        tokenReceiver: accounts[8]
    };

    async function freshInstance(required=2) {
        return SimpleMultiSigWallet.new([accounts[0], accounts[1], accounts[2]], required, {from: accounts[0]});
    }

    async function getOwners(instance) {
        const totalOwners = (await instance.m_numOwners()).toNumber();
        const calls = [];
        for (let i = 0; i < totalOwners; i++)
            calls.push(instance.getOwner(i));
        return Promise.all(calls);
    }

    let token;

    beforeEach(async function () {
        token = await Token.new({from: role.tokenOwner});
    });

    it("ctor check", async function() {
        await expectThrow(SimpleMultiSigWallet.new([accounts[0], accounts[1], accounts[2]], 20, {from: accounts[0]}));
        await expectThrow(SimpleMultiSigWallet.new([accounts[0], accounts[1], accounts[0]], 1, {from: accounts[0]}));
        await expectThrow(SimpleMultiSigWallet.new([accounts[0], accounts[1], 0], 1, {from: accounts[0]}));

        let instance = await SimpleMultiSigWallet.new([accounts[0]], 1, {from: accounts[0]});
        assert.deepEqual(await getOwners(instance), [accounts[0]]);

        instance = await SimpleMultiSigWallet.new([accounts[0], accounts[1]], 2, {from: accounts[0]});
        assert.deepEqual(await getOwners(instance), [accounts[0], accounts[1]]);

        instance = await freshInstance();
        assert.deepEqual(await getOwners(instance), [accounts[0], accounts[1], accounts[2]]);
    });

    it("single-signature send check", async function() {
        const instance = await freshInstance(1);

        await instance.send(web3.toWei(10, 'finney'), {from: accounts[0]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(10, 'finney')));

        // unauthorised
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(5, 'finney'), {from: accounts[3]}));
        await expectThrow(instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(5, 'finney'), {from: accounts[3]}));

        await expectThrow(instance.sendEther(0, web3.toWei(5, 'finney'), {from: accounts[0]}));
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(0, 'finney'), {from: accounts[0]}));
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(15, 'finney'), {from: accounts[0]}));

        // unauthorised
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(5, 'finney'), {from: accounts[3]}));
        await expectThrow(instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(5, 'finney'), {from: accounts[3]}));

        await instance.sendEther(accounts[1], web3.toWei(2, 'finney'), {from: accounts[0]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(8, 'finney')));
        await instance.sendEther(accounts[3], web3.toWei(2, 'finney'), {from: accounts[1]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(6, 'finney')));
        await instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(2, 'finney'), {from: accounts[2]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(4, 'finney')));

        // unauthorised
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(5, 'finney'), {from: accounts[3]}));
        await expectThrow(instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(5, 'finney'), {from: accounts[3]}));
    });

    it("double-signature errors check", async function() {
        const instance = await freshInstance();

        await instance.send(web3.toWei(10, 'finney'), {from: accounts[0]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(10, 'finney')));

        // this actions are in pending state for now
        await instance.sendEther(0, web3.toWei(5, 'finney'), {from: accounts[0]});
        await instance.sendEther(accounts[3], web3.toWei(0, 'finney'), {from: accounts[0]});
        await instance.sendEther(accounts[3], web3.toWei(15, 'finney'), {from: accounts[0]});

        // unauthorised
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(5, 'finney'), {from: accounts[3]}));
        await expectThrow(instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(5, 'finney'), {from: accounts[3]}));

        await expectThrow(instance.sendEther(0, web3.toWei(5, 'finney'), {from: accounts[1]}));
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(0, 'finney'), {from: accounts[1]}));
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(15, 'finney'), {from: accounts[1]}));

        // unauthorised
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(5, 'finney'), {from: accounts[3]}));
        await expectThrow(instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(5, 'finney'), {from: accounts[3]}));
    });

    it("double-signature send check", async function() {
        const instance = await freshInstance();

        await instance.send(web3.toWei(10, 'finney'), {from: accounts[0]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(10, 'finney')));

        // unauthorised
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(5, 'finney'), {from: accounts[3]}));
        await expectThrow(instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(5, 'finney'), {from: accounts[3]}));

        // this actions are in pending state for now
        await instance.sendEther(accounts[1], web3.toWei(2, 'finney'), {from: accounts[2]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(10, 'finney')));
        await instance.sendEther(accounts[3], web3.toWei(2, 'finney'), {from: accounts[2]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(10, 'finney')));
        await instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(2, 'finney'), {from: accounts[0]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(10, 'finney')));

        // unauthorised
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(5, 'finney'), {from: accounts[3]}));
        await expectThrow(instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(5, 'finney'), {from: accounts[3]}));

        // makes no sense to repeat calls - still 10 ether in possession!
        await instance.sendEther(accounts[1], web3.toWei(2, 'finney'), {from: accounts[2]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(10, 'finney')));
        await instance.sendEther(accounts[3], web3.toWei(2, 'finney'), {from: accounts[2]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(10, 'finney')));
        await instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(2, 'finney'), {from: accounts[0]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(10, 'finney')));

        // unauthorised
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(5, 'finney'), {from: accounts[3]}));
        await expectThrow(instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(5, 'finney'), {from: accounts[3]}));

        await instance.sendEther(accounts[1], web3.toWei(2, 'finney'), {from: accounts[0]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(8, 'finney')));
        await instance.sendEther(accounts[3], web3.toWei(2, 'finney'), {from: accounts[1]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(6, 'finney')));
        await instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(2, 'finney'), {from: accounts[2]});
        assert(await web3.eth.getBalance(instance.address).eq(web3.toWei(4, 'finney')));

        // unauthorised
        await expectThrow(instance.sendEther(accounts[3], web3.toWei(5, 'finney'), {from: accounts[3]}));
        await expectThrow(instance.sendEther('0x0000000000000000000000000000000000000012', web3.toWei(5, 'finney'), {from: accounts[3]}));
    });

    it("send tokens check", async function() {
        const instance = await freshInstance();

        await token.mint(instance.address, 100, {from: role.tokenOwner});
        assert.equal(100, await instance.tokenBalance(token.address));
        assert.equal(100, await token.balanceOf(instance.address));
        assert.equal(0, await token.balanceOf(role.tokenReceiver));

        await expectThrow(instance.sendTokens(token.address, role.tokenReceiver, 10, {from: role.nobody}));

        await instance.sendTokens(token.address, role.tokenReceiver, 10, {from: role.owner1});
        assert.equal(100, await token.balanceOf(instance.address));
        assert.equal(0, await token.balanceOf(role.tokenReceiver));

        await instance.sendTokens(token.address, role.tokenReceiver, 10, {from: role.owner2});
        assert.equal(90, await token.balanceOf(instance.address));
        assert.equal(10, await token.balanceOf(role.tokenReceiver));

        // from zero address
        await instance.sendTokens(0, role.tokenReceiver, 10, {from: role.owner1});
        await expectThrow(instance.sendTokens(0, role.tokenReceiver, 10, {from: role.owner2}));

        // to zero address
        await instance.sendTokens(token.address, 0, 10, {from: role.owner1});
        await expectThrow(instance.sendTokens(token.address, 0, 10, {from: role.owner2}));

        // the same address
        await instance.sendTokens(token.address, token.address, 10, {from: role.owner1});
        await expectThrow(instance.sendTokens(token.address, token.address, 10, {from: role.owner2}));

        // from non contract
        await instance.sendTokens(role.nobody, role.tokenReceiver, 10, {from: role.owner1});
        await expectThrow(instance.sendTokens(role.nobody, role.tokenReceiver, 10, {from: role.owner2}));

        // successful after negative test
        await instance.sendTokens(token.address, role.tokenReceiver, 10, {from: role.owner1});
        await instance.sendTokens(token.address, role.tokenReceiver, 10, {from: role.owner2});
        assert.equal(20, await token.balanceOf(role.tokenReceiver));

    });

    // FIXME TODO reentrancy test

});
