import {SubstrateEvent} from "@subql/types";
import {Account, AccountSnapshot, Transfer} from "../types";
import { AccountInfo } from "@polkadot/types/interfaces/system";
import {getEventAccounts, readEspecialAccounts} from "../handlers";

export async function handleTransferred(event: SubstrateEvent): Promise<void> {
    let blockNumber = event.block.block.header.number.toBigInt()    
    let timestamp = event.block.timestamp;
    await saveTransferred(event, timestamp, blockNumber)       
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    let blockNumber = event.block.block.header.number.toBigInt()    
    let accountsInEvent = await getEventAccounts(event)
    let timestamp = event.block.timestamp;

    let especialAccountsOnly = true

    if (especialAccountsOnly==true) {
        let blockNum= event.block.block.header.number.toNumber()
        if(blockNum==8381792) {
            let espAccounts = await readEspecialAccounts()
            logger.info("Handling especial Accounts ")
            for (const account of espAccounts) {
                accountsInEvent.push(account)
            }
        }
    }

    if (accountsInEvent.length > 0) {
        for (const account of accountsInEvent) {
            await saveAccountBalance(event, timestamp, blockNumber, account)
            await saveAccountSnapshot(event, timestamp, blockNumber, account)
        }
    }
}

export async function saveAccountBalance(event: SubstrateEvent, timestamp: Date, blockNumber: bigint, account: string): Promise<void> { 
    logger.info("Saving AccountBalance for id!: " + account);
    const raw: AccountInfo = (await api.query.system.account(
        account
      )) as unknown as AccountInfo;

    if (raw) {
        let record = await Account.get(account);
        if (!record) {
            record = Account.create({
                id: account,
                account: account
              });
        }
        record.freeBalance = raw.data.free.toBigInt();
        record.reserveBalance = raw.data.reserved.toBigInt();
        record.totalBalance = raw.data.free.toBigInt() + raw.data.reserved.toBigInt();
        record.blockNumber = blockNumber
        record.timestamp = timestamp

        await record.save().then((ress) => {
            //logger.info("totalAccount save =>"+ ress)
        })
        .catch((err) => {
            logger.info("saveAccountBalance error => " + err)
            logger.info("====> event record=> " + JSON.stringify(event))
        });        
    } else {
        logger.info("No raw==============================")
    }
}

export async function saveAccountSnapshot(event: SubstrateEvent, timestamp: Date, blockNumber: bigint, account: string): Promise<void> { 
    logger.info("Saving AccountSnapshot for id!: " + account);
    const raw: AccountInfo = (await api.query.system.account(
        account
      )) as unknown as AccountInfo;

    if (raw) {
        let id = `${blockNumber.toString()}-${account}`;
        let record = await AccountSnapshot.get(id);
        if (!record) {
            record = AccountSnapshot.create({
                id: account,
                account: account
              });
        }
        record.freeBalance = raw.data.free.toBigInt();
        record.reserveBalance = raw.data.reserved.toBigInt();
        record.totalBalance = raw.data.free.toBigInt() + raw.data.reserved.toBigInt();
        record.blockNumber = blockNumber
        record.timestamp = timestamp

        await record.save().then((ress) => {
            //logger.info("totalAccount save =>"+ ress)
        })
        .catch((err) => {
            logger.info("saveAccountSnapshot error => " + err)
            logger.info("====> event record=> " + JSON.stringify(event))

        });        
    } else {
        logger.info("No raw==============================")
    }
}

export async function saveTransferred(event: SubstrateEvent, timestamp: Date, blockNumber: bigint): Promise<void> { 
    const [account, account2, amount] = event.event.data.toJSON() as [string,string, bigint];
    if (amount < 10000000000000) {
        logger.info("Ignoring Transfer less than 10000 from id!: " + account);   
        return 
    }

    logger.info("Saving Transferred from id!: " + account);

    let eventID = event.phase.asApplyExtrinsic.toString()
    let id = `${blockNumber.toString()}-${eventID}`;
    let record = await Transfer.get(id);
    if (!record) {
        record = Transfer.create({
            id: account,
        });
    }
    record.accountFrom = account;
    record.accountTo = account2;
    record.amount = amount;
    record.blockNumber = blockNumber
    record.timestamp = timestamp

    await record.save().then((ress) => {
        //logger.info("totalAccount save =>"+ ress)
    })
    .catch((err) => {
        logger.info("saveTransferred error => " + err)
        logger.info("====> event record=> " + JSON.stringify(event))

    });        
}