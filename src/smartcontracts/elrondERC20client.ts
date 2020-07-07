import { ERC20Client } from "./interface";
import { Provider } from "../providers/interface";
import { Account, Address } from "../data/account";
import { BasicERC20Client } from "./erc20client";

export class ElrondERC20Client extends BasicERC20Client implements ERC20Client {
    constructor(provider: Provider | null, scAddress: Address, user: Account, chainID: string, version: number) {
        super(provider, scAddress, user, chainID, version);
        this.functionName_transfer = "transferToken";
    }
}

