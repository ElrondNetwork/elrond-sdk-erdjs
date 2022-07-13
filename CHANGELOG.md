# Change Log

All notable changes will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 11.0.0
 - [Breaking change: Sender is now mandatory when constructing a transaction](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/TBD)

## 10.2.7
 - [Update reference to keccak](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/222)

## 10.2.6
 - [Define EgldOrEsdtTokenIdentifier](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/220)

## 10.2.5
 - [Minor refactoring](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/214)

## 10.2.4
 - [Fix for loops](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/212)

## 10.2.3
 - [Minor improvements and fixes](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/210)

## 10.2.2
 - [Decoupling, minor refactoring](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/209)

## 10.2.1
 - [When loading the ABI, sort custom types by their type dependencies](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/208)

## 10.2.0
 - [Define Transaction Factory and Gas Estimator](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/203)
 - [Fix type mapper / ABI registry (scenario: nested structs with ArrayN)](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/198)
 - [Add extra type for known-length arrays](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/206)

## 10.1.2
 - [Fix ABI endpoint definition: attribute "mutability"](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/200)

## 10.1.1
 - [Add missing package "blake2b" (removed by mistake)](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/199)

## 10.1.0
 - [Fix exports and prepare release of erdjs 10](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/197)
 - [Bit of cleanup prior release (breaking changes), update readme & docs. Add payload builders for token transfers](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/196)
 - [Breaking change: Deprecate EsdtHelpers in favor of @elrondnetwork/transaction-decoder](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/195)
 - [Breaking change: Deprecate / remove balance & balance builder](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/194)
 - [TokenPayment instead of Balance, where applicable](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/193)
 - [Breaking changes: cleanup and minor improvements prior release (step 2)](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/191)
 - [Breaking changes: cleanup and minor improvements prior release (step 1)](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/190)
 - [Remove SmartContractController (downgraded to a mere test utility)](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/188)
 - [Breaking change: rename "methods" to "methodsExplicit". Rename "methodsAuto" to "methods" (default choice)](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/187)
 - [Breaking change: extractions (network providers and contract wrappers)](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/186)
 - [Breaking change: unifying provider interfaces, preparing network providers for extraction - step 5](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/185)
 - [Breaking change: unifying provider interfaces, preparing network providers for extraction - step 4](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/184)
 - [Breaking change: SmartContract does not depend on IProvider anymore](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/183)
 - [Breaking change: unifying provider interfaces, preparing network providers for extraction - step 3](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/182)
 - [Breaking change: unifying provider interfaces, preparing network providers for extraction - step 2](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/181)
 - [Breaking change: unifying provider interfaces, preparing network providers for extraction - step 1](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/180)
 - [Breaking change: decouple networkStake, networkStatus and stats from IProvider & IApiProvider](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/179)
 - [Breaking change: preparatory refactoring for decoupling core objects from IProvider](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/178)
 - [Fix / improve results parser (better heuristics)](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/177)
 - [Breaking change: simplify network config / improve design - not a singleton anymore](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/176)
 - [Breaking change: adjustements to transaction awaitening and completion, transaction watcher](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/173)
 - [Remove trackOfTransactions (private field, not actually used)](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/172)
 - [Extract dapp / signing providers to separate repositories](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/170)
 - [Breaking changes: improve contract interactions and interpretation of contract results](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/159)

 **Breaking changes**
 - Moved network providers and contract wrappers to separate repositories:
   - https://github.com/ElrondNetwork/elrond-sdk-erdjs-network-providers
   - https://github.com/ElrondNetwork/elrond-sdk-erdjs-contract-wrappers
 - The dapp / signing providers have been extracted to separate repositories:
   - https://github.com/ElrondNetwork/elrond-sdk-erdjs-hw-provider
   - https://github.com/ElrondNetwork/elrond-sdk-erdjs-web-wallet-provider
   - https://github.com/ElrondNetwork/elrond-sdk-erdjs-wallet-connect-provider
   - https://github.com/ElrondNetwork/elrond-sdk-erdjs-extension-provider
 - Removed utility functions: `transaction.awaitExecuted()`, `transaction.awaitPending()`. `TransactionWatcher` should be used directly, instead.
 - Changed interface of `TransactionWatcher`. The constructor does not expect a transaction hash anymore, but the functions `await*` do.
 - Introduced new functions on `TransactionWatcher`: `awaitCompleted()`, `awaitAllEvents()`, `awaitAnyEvent()` etc.
 - Removed `Transaction.status` (the one on `TransactionOnNetwork` should be read instead).
 - `Transaction.getAsOnNetwork()` does not wait for notarization / completion anymore. One should explicitly use the transaction watcher, when needed.
 - Removed `NetworkConfig.getDefault()` and `NetworkConfig.sync()`. Instead, one should use `let networkConfig = await provider.getNetworkConfig()`.
 - Constructor of `Transaction` now requires `chainID`, as well.
 - Added `Interaction.withChainID()` - must be used before calling `buildTransaction()`.
 - Altered a bit the public interface of `TransactionEvent`, `Receipt` (renamed fields, renamed methods).
 - Removed `transaction.getAsOnNetwork()`. One should use `provider.getTransaction()` instead.
 - Removed `acount.sync()`. Replaced by `account.update({ nonce, balance})`.
 - Removed `transaction.send()`. `Provider.sendTransaction()` has to be used instead.
 - Removed the static functions `getDefault()` and `sync()` from `networkStake`, `networkStatus` and `stats`.
 - Removed `smartContract.runQuery()` in order to decouple the contract class from the network provider. `smartContract.createQuery()` + `provider.queryContract()` have to be used, instead.
 - Renamed `methods` to `methodsExplicit` (explicitly typed values). Added a new `contract.methods` object, which performs automatic type inference. Therefore, by default, interactions are created without having to pass `TypedValue` objects as parameters. The type inference system was implemented in the past, in the `nativeSerializer` component - PR https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/9 by @claudiu725.
 - erdjs does not depend on `axios` and `fs` anymore. Changed the way an `AbiRegistry` is created. Removed function `Code.fromFile()` (was relying on `fs`).
 - Removed `smartContract.getOwner()` (surprising behavior of function, usage not recommended).
 - Removed `transaction.awaitHashed()` (lacks use-case).
 - Removed `transaction.awaitSigned()` (it isn't useful in relation with any of our signing providers).
 - Removed not used interfaces (e.g. `ISignable` is not needed in erdjs, but in walletcore).
 - Removed `interaction.getContract()`. Add `interaction.getContractAddress()`.
 - Remove `interaction.withGasLimitComponents()`. Not so helpful anymore (since `NetworkConfig` isn't a singleton anymore).
 - `TokenPayment` should be used instead of `Balance`, where applicable.
 - Deprecate / remove `Balance` & `BalanceBuilder`. `TokenPayment` / `IAccountBalance` (a simple big number) should be used instead, depending on the purpose.
 - Deprecated `EsdtHelpers` in favor of `@elrondnetwork/transaction-decoder`.
 - Breaking change: removed `Nonce`, in favor of the interface `INonce`.
 - Breaking change: removed `GasLimit` in favor of the interface `IGasLimit`.
 - Breaking change: removed `GasPrice` in favor of the interface `IGasPrice`.
 - Breaking change: removed `ChainID` in favor of the interface `IChainID`.
 - Breaking change: deprecate `scArgumentsParser` in favor of `@elrondnetwork/transaction-decoder`.

 - `ExecutionResultsBundle` and `QueryResponseBundle` have been removed, and replaced by `TypedOutcomeBundle` (and its untyped counterpart, `UntypedOutcomeBundle`).
 - `SmartContractResults` has been changed to not use the concepts `immediate result` and `resulting calls` anymore. Instead, interpreting `SmartContractResults.items` is now the responsibility of the `ResultsParser`.
 - Redesigned `QueryResponse`, changed most of its public interface. Results interpretation is now the responsibility of the results parser.
 - `interpretQueryResponse()` and `interpretExecutionResults()` do not exist on the `Interaction` object anymore.
 - `TokenIdentifierValue` is constructed using a `string`, not a `buffer`. Its `valueOf()` is now a string, as well.
 - The `Interaction` constructor does not receive the `interpretingFunction` parameter anymore.
 - `Interaction.getInterpretingFunction()` and `Interaction.getExecutingFunction()` have been removed, replaced by `Interaction.getFunction()`.
 - `DefaultInteractionRunner` has been removed.
 - `StrictChecker` has been renamed to `InteractionChecker`. It's public interface - the function `checkInteraction()` - has changed as well (it also requires the endpoint definition now, as a second parameter).
 - The functions `getReceipt()`, `getSmartContractResults()` and `getLogs()` of `TransactionOnNetwork` have been removed. The underlying properties are now public.
 - Renamed `OptionValue.newMissingType()` to `OptionValue.newMissingTyped()`
 - Queries with a return code different than `Ok` do not automatically throw an exception anymore (`assertSuccess()` has to be called explicitly in order to throw).
 
**Other changes**
 - Implement the `ResultsParser` for parsing query responses and contract results.
 - Improved transaction completion detection, via the `TransactionWatcher`.
 - Added new transaction payload builders, for token transfers.
 - Added utility function `getFieldValue()` on `Struct` and `EnumValue`.
 - Refactoring in the `networkProvider` package (under development, in order to merge the provider interfaces under a single one)
 - Added utility function `Interaction.useThenIncrementNonceOf()`
 - Fixed `nativeSerializer` to not depend on `SmartContract`, `ContractWrapper` and `TestWallet` anymore (gathered under an interface).
 - Replaced the old `lottery-egld` with the new `lottery-esdt` in integration tests.
 - Added missing tests for some components: `nativeSerializer`, `struct`, `enum`.
 - Added utility function `OptionalValue.newMissing()`. Added "fake" covariance wrt. "null type parameter" (when value is missing) on `OptionalType`.
 - Added utility functions (typed value factories): `createListOfAddresses`, `createListOfTokenIdentifiers`.

## [9.2.4]
 - [Hardcode class names for classes within erdjs' typesystem.](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/164)

## [9.2.3]
 - [Fix log level in transaction watcher.](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/160)

## [9.2.2]
 - [Wallet Provider: add "options" on tx sign return value](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/157)

## [9.2.1]
 - [Fix / simplify some imports](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/148)
 - [Handle strings in binary codec](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/153)
 - [Fix data fetching from the blockchain - wait before polling for the first time](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/152)

## [9.2.0]
 - [Fix WalletProvider URL when nonce = 0](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/137)
 - [Fix padding for getTxFieldsForEsdtTransfer](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/140)
 - [Added payableBySc to CodeMetadata](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/141)
 - [Remove usages of guardType()](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/143)
 - [Remove JavaScript's native instanceof, where possible](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/145)

## [9.1.0]
  - [Interactions: enable token transfers ("transfer with execute")](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/131)
  - [Fix constructor of `NumericalValue`](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/128).
  - [Sketch logs & events, add extra fields on TransactionOnNetwork, define TokenOfAccountOnNetwork](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/129).
  - [Extra exports, better `toString()`, better handling of empty addresses, `gasLimit` helpers](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/130).

## [9.0.3]
 - [Extension Provider throw error if tx canceled](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/111).
 - [Add fromAbiUrl() - paired with fromAbiPath()](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/121).
 - [Redo](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/122) of PR [Better typing for ABI methods](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/61).
 - [For integration tests, resolve ambiguity between devnet & local-testnet](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/124).
 - [Fix `transaction.getAsOnNetwork()` to work both with `ProxyProvider` and `ApiProvider` (PARTIAL FIX)](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/123).

## [9.0.2]
 - [Fix recursivity issue when mapping types](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/114).
 - Bump version, since previously published `8.0.2-alpha.1` version is picked as `latest` version by npmjs.

## [9.0.1]
- [Add globals polyfill for Buffer](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/112)


## [9.0.0]
- [Fix smart contract results to align to the new API field namings]
    - Breaking changes:
        - `smartContractResults` property in `TransactionOnNetwork` was renamed to `results` as in the new API,
        affecting `fromHttpResponse` method
        - `ErrStructTyping` has been removed
        - `EnumValue.valueOf()` does not return a string (the name of the variant) anymore. It returns a JS object such as `{"name": "name of variant", "fields": { ... }}`
        - `StructFieldDefinition` has been replaced by `FieldDefinition`, while `StructField` has been replaced by `Field`.

- [Fix ExtensionProvider sign/send transaction response #72](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/72)
    - Provider's send/sign transaction methonds responded with plainObject transactions instead of Transaction
    - Added fromPlainObject method as a static method to transaction
 
- [Add signAuthToken method to HWProvider #73](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/73) 
- [Fix for ignored config options in proxyProvider and apiProvider #76](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/76)
- [Fix wallet logout/login redirect when using form submit](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/85)
- [Fix ExtensionProvider sign message #86](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/86)
    - Add address to SignableMessage response

- [Handle extension errors #87](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/87)
    - Handle erros when sign/send transactions fails on extension side
- [Handle heterogeneous enums with fields](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/98)
- [Background communication channel with extension popup](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/103)


## [8.0.0]
- [ExtensionProvider] https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/66

    - ### Breaking changes:
      - Extension Provider can no longer be instantiated with `new ExtensionProvider`
        -Added `static getInstance` method

## [7.0.1]
- [Bugfix for Safari - removed negative lookbehind regex #67](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/67)
- [Bugfix on WalletConnect signTransactions single Tx case #69](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/69)

## [7.0.0]
- [Contract wrapper](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/9)
    - Added `ContractWrapper`, `SystemWrapper` - for more details check the pull request.
    - Added support for constructors in ABIs
    - Added ABIs:
      - builtin functions
      - ESDT system smart contract
    - Added `BalanceBuilder` interface
    - Added `NativeSerializer`

    - ### Breaking changes:
      - Changed how a provider is obtained:
        - Removed `getDevnetProvider`, `getTestnetProvider`, `getMainnetProvider`
        - Use added `chooseProvider`
      - Renamed `ESDTToken` to `Token`
      - Changed how test wallets (alice, bob, carol etc.) are obtained, added all 12 test wallets:
        - Removed `TestWallets`
        - Use added function `loadTestWallets` (or `loadInteractive`)

- [Fixed Ledger login](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/48)
   - Fixed Ledger login by also setting the index to the device.
  
   - ### Breaking changes:
     - Removed `addressIndex` from constructor
     - Use `addressIndex` from `options` object of `login` function

- [Added Extension Provider for dapp integration #59](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/59)

- [Refactored WalletProvider #60](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/60)
   - Refactored wallet provider to be compatible with all browsers
   - Added `signTransactions` so users can sign transaction batches
   - Added `getTransactionsFromWalletUrl` endpoint so users can retrieve the decoded `Transaction` object from the `callbackUrl`
  
   - ### Breaking changes:
     - The WalletProvider no longer communicates with the ElrondWallet through an iframe
     - The above means that we no longer have a way to get some info - so `getAddress` will throw `ErrNotImplemented`
     - Removed `customId` from constructor

- [Added signTransactions to the WalletConnectProvider #62](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/62)

- [Added signTransactions to the HWProvider #64](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/64)

## [6.6.2]
-   [Quickfix - added custom id to iframe creation #55](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/55)

## [6.6.1]
-   [Bugfixed WalletProvider by adding possibility to match iframe by id #53](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/53)

## [6.6.0]
-   [Added signature to walletConnectProvider to handle Token Login #49](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/49)

## [6.5.2]
-   [Bugfix - corrected compute hash for transaction with options #44](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/44)

## [6.5.1]
-   [Adapted message signing for ledger #42](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/42)

## [6.5.0]
-   [Extended SignableMessage to allow export to JSON #40](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/40)
-   [Bugfix: fixed option decoder #39](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/39)

## [6.4.1]
-   [Keep WalletConnect session alive if still connected on init() #37](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/37)

## [6.4.0]
-   [Added web wallet token option for login hook #33](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/33)

## [6.3.1]
-   [Bugfix - Exported UserVerifier #31](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/31)

## [6.3.0]
-   [Added message signing component #28](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/28)

## [6.2.1]
-   [Bugfix for number of accounts returned by getAccounts #26](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/26)

## [6.2.0]
-   [Added custom message to the walletconnect provider #23](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/23)

## [6.1.1]

-   [Updated ESDTToken fields to match new API response #20](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/20)
    -   `token` is now `identifier`

## [6.1.0]

-   [Added simple signing function for dapp providers #17](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/17)

## [6.0.0]

-   [Added encryption component #11](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/11)
-   [Added option to config the axios requests #10](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/10)
    -   Breaking changes:
        1. `new ProxyProvider(url: string, timeout?: number)` becomes `new ProxyProvider(url: string, config?: AxiosRequestConfig)` -
           note that `timeout` can still be passed in the `config` object

## [5.0.1] - 07.06.2021

-   [Feat/nft token #3](https://github.com/ElrondNetwork/elrond-sdk-erdjs/pull/3)

## [5.0.0] - 19.05.2021

-   [Remove event target and add callback #310](https://github.com/ElrondNetwork/elrond-sdk/pull/310)
-   [FIx abi registry for struct type #309](https://github.com/ElrondNetwork/elrond-sdk/pull/309)
-   [added helpers functions for esdt and sc arguments parser #301](https://github.com/ElrondNetwork/elrond-sdk/pull/301)
-   Update packages #298, #299, #302, #303, #304, #305

## [4.2.2] - 06.05.2021

-   [Fix infinite loop on wallet connect logout #294](https://github.com/ElrondNetwork/elrond-sdk/pull/294)

## [4.2.1] - 05.05.2021

-   [Fix get transaction endpoint #290](https://github.com/ElrondNetwork/elrond-sdk/pull/290)

## [4.2.0] - 05.05.2021

-   [Add wallet connect provider #286](https://github.com/ElrondNetwork/elrond-sdk/pull/286)

## [4.1.0] - 29.04.2021

-   [Add decode string and decode bignumber #282](https://github.com/ElrondNetwork/elrond-sdk/pull/282)
-   [Add generic methods for GET and POST #280](https://github.com/ElrondNetwork/elrond-sdk/pull/280)
-   [Fix Dapp callback URL #278](https://github.com/ElrondNetwork/elrond-sdk/pull/278)
-   [Add esdtTokens endpoints #272](https://github.com/ElrondNetwork/elrond-sdk/pull/272)
-   [Add TupleType #268](https://github.com/ElrondNetwork/elrond-sdk/pull/268)
-   Other minor fixes #281 #279 #277 #276 #265 #260 #259

## [4.0.3] - 02.04.2021

-   [ABI-based contract interaction. Redesigned typing system #107](https://github.com/ElrondNetwork/elrond-sdk/pull/107)
-   [Add `variadic` type for typeMapper #257](https://github.com/ElrondNetwork/elrond-sdk/pull/257)

## [3.1.3] - 26.03.2021

-   [Fixed ledger signing using hash fields #245](https://github.com/ElrondNetwork/elrond-sdk/pull/245)

## [3.1.2] - 24.03.2021

-   [Fixed ledger login feature #240](https://github.com/ElrondNetwork/elrond-sdk/pull/240)
-   [Fixed asBool value for contract query response #241](https://github.com/ElrondNetwork/elrond-sdk/pull/241)

## [3.1.1] - 22.03.2021

-   [Fixed a bug on account query regarding usernames #235](https://github.com/ElrondNetwork/elrond-sdk/pull/235)

## [3.1.0] - 03.03.2021

-   [Added network status endpoint #229](https://github.com/ElrondNetwork/elrond-sdk/pull/229)
-   [Sign tx with hash functionality #217](https://github.com/ElrondNetwork/elrond-sdk/pull/217)

## [3.0.0] - 03.03.2021

-   [Switched from native BigInt to bignumber.js #218](https://github.com/ElrondNetwork/elrond-sdk/pull/218)

## [2.3.0] - 16.02.2021

-   [Minor bugfixes and new getNetworkStats function #203](https://github.com/ElrondNetwork/elrond-sdk/pull/203)

## [2.2.2] - 11.02.2021

-   [Walletcore minor fixes on Uint8Array casting before Buffers are passet to tweetnacl #198](https://github.com/ElrondNetwork/elrond-sdk/pull/198)

## [2.2.1] - 10.02.2021

-   [Walletcore improvements - minor fixes on PEM parsing, added tests #195](https://github.com/ElrondNetwork/elrond-sdk/pull/195)

## [2.2.0] - 09.02.2021

-   [Add api provider and userName to getAccount #191](https://github.com/ElrondNetwork/elrond-sdk/pull/191)

## [2.1.0] - 05.02.2021

-   [Add logout on dapp #183](https://github.com/ElrondNetwork/elrond-sdk/pull/183)

## [2.0.0] - 03.02.2021

-   [Fix query http request #178](https://github.com/ElrondNetwork/elrond-sdk/pull/178)

## [1.1.9] - 03.02.2021

-   [Add handling for null on Contract return data #160](https://github.com/ElrondNetwork/elrond-sdk/pull/160)

## [1.1.8] - 15.01.2021

-   Publish erdjs via Github Actions #151.
-   Minor fixes for dApps (wallet integration) #153.

## [1.1.7] - 15.01.2021

-   Bring core-js into erdjs (user wallets & signing, validator signing).
-   Run all tests (unit and integration) in browser, as well.
-   Separate builds: erdjs with / without wallet components.

## [1.1.5] - 06.01.2021

-   Updated axios library due to security vulnerabilities.

## [1.1.4] - 10.12.2020

-   Add some utility functions for ABI (needed for some interaction examples among SC templates).

## [1.1.3] - 03.12.2020

Pull requests:

-   [New type system (with generics), codecs (elrond-wasm alike) and ABI prototype.](https://github.com/ElrondNetwork/elrond-sdk/pull/87)
-   [Compute TX hash off-line](https://github.com/ElrondNetwork/elrond-sdk/pull/93)

In more detail:

-   New typing system to better match elrond-wasm's typing system (our standard typing system for smart contracts). Generics (simple or nested) included.
-   ABI prototype (functions, structures).
-   Codec utilities
-   Optional arguments supported as well.
-   Compute TX hash in an off-line fashion (not relying on the Node / Proxy).

Breaking changes:

-   Members of `Argument` class have been renamed.
-   Members of `Balance` class have been renamed.

## [1.1.2] - 17.11.2020

-   Removed useless check and add the current Ledger selection as sender.

## [1.1.1] - 17.11.2020

-   Corrected transaction object sent to the wallet provider.

## [1.1.0] - 13.11.2020

-   Add elrond-wallet and hardware wallet support.

## [1.0.8] - 03.11.2020

-   Export `backendSigner` as well (for `NodeJS` version).
-   Fix (update) the example `backend-dispatcher`.

## [1.0.7] - 02.11.2020

-   Moved release `1.0.7` out of beta.

## [1.0.7-beta1] - 30.10.2020

-   Added comments & documentation.
-   Implemented utilities for contract queries.
-   Made `erdjs` smaller, for loading in browsers.
-   Applied several steps of refactoring.
-   Improved reporting of HTTP-related errors.
-   Fixed parsing of big integers in `axios` responses.
-   Implemented a simple logger component.
-   Improved tests (added more unit tests and integration tests).
-   Fixed implementation of `length()` for `TransactionPayload`.
