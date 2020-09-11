import '@pefish/js-node-assist'
import Starter from '@pefish/js-util-starter'
import { EthWallet } from '@pefish/js-coin-eth'
const packageJson = require('../package.json')
import commander, { Command } from 'commander'
import chalk from 'chalk'

declare global {
  namespace NodeJS {
    interface Global {
      logger: any,
      config: {[x: string]: any};
      debug: boolean;
    }
  }
}

const wallet = new EthWallet()

global.logger = console

let privateKey: string, action: string, actionArgs: {[x: string]: any}, cmdObj: Command, otherArgs: any[],
 node: string, poolContractAddress: string,
 gasPrice: string, nonce: number

const actionMap = {
  // 退出挖矿
  exit: async (actionArgs: {[x: string]: any}) => {
    global.logger.info(`开始执行 ${action} 动作...\n`)
    const address = wallet.getAddressFromPrivateKey(privateKey)

    if (gasPrice === "") {
      global.logger.info(`评估 gasPrice 中...`)
      gasPrice = await wallet.remoteClient.estimateGasPrice("1000".shiftedBy_(9))
      global.logger.info(`评估完成，gasPrice 为 ${gasPrice.unShiftedBy_(9)} GWei。\n`)
    }

    global.logger.info(`构建交易中...`)
    if (nonce === 0) {
      nonce = await wallet.remoteClient.getNextNonce(address)
    }
    const tx = await wallet.buildContractTx(
      privateKey,
      poolContractAddress,
      "exit()",
      [],
      [],
      nonce,
      gasPrice,
      "200000"
    )
    global.logger.info(`交易构建完成。\n`)

    global.logger.info(`发送交易中...`)
    await wallet.remoteClient.wrapRequest("eth", "sendRawTransaction", [tx.txHex])
    global.logger.info(`发送交易完成。 txid为：${tx.txId}\n`)

    global.logger.info(`${action} 动作执行完成。感谢使用\n`)
  },
}

const program = commander
  .name(packageJson.appName)
  .version(packageJson.version, '-v, --version')
  .arguments('<private-key>')
  .arguments(`<action>`)
  .arguments('<action-args>')
  .usage(`[options] ${chalk.green('<private-key>')} ${chalk.green('<action>')}(${Object.keys(actionMap).join(",")}) ${chalk.green('<action-args>')}`)
  .allowUnknownOption()
  .option('-n, --node [string]', 'eth node', `https://mainnet.infura.io/v3/aaa3fc062661462784b334a1a5c51940`)
  .requiredOption('-c, --contract [string]', 'pool contract address')
  .option('-g, --gasprice [string]', 'gas price, gwei', "")
  .option('--nonce [number]', 'nonce', "")



program
  .action((privateKey_: string, action_: string, actionArgs_: string, cmdObj_: Command, otherArgs_: string[]) => {
    privateKey = privateKey_
    action = action_
    actionArgs = actionArgs_ && JSON.parse(actionArgs_)
    cmdObj = cmdObj_
    otherArgs = otherArgs_
    node = program.node
    poolContractAddress = program.contract
    gasPrice = program.gasprice
    nonce = program.nonce ? program.nonce.toNumber_() : 0
  })
  .parse(process.argv);

Starter.startAsync(async () => {
  await wallet.initRemoteClient(node)
  if (!actionMap[action]) {
    global.logger.error("action指定错误")
    return
  }
  await actionMap[action](actionArgs)
})


