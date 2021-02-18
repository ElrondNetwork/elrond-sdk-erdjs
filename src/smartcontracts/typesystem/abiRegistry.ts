import * as fs from "fs";
import * as errors from "../../errors";
import axios, { AxiosResponse } from "axios";
import { guardValueIsSetWithMessage } from "../../utils";
import { StructType } from "./struct";
import { ContractInterface } from "./contractInterface";
import { CustomType } from "./types";
import { EnumType } from "./enum";

export class AbiRegistry {
    readonly interfaces: ContractInterface[] = [];
    readonly customTypes: CustomType[] = [];

    async extendFromFile(file: string): Promise<AbiRegistry> {
        let jsonContent: string = await fs.promises.readFile(file, { encoding: "utf8" });
        let json = JSON.parse(jsonContent);
        
        return this.extend(json);
    }

    async extendFromUrl(url: string): Promise<AbiRegistry> {
        let response: AxiosResponse = await axios.get(url);
        let json = response.data;
        return this.extend(json);
    }

    extend(json: { name: string, endpoints: any[], types: any[] }): AbiRegistry {
        json.types = json.types || {};

        // The "endpoints" collection is interpreted by "ContractInterface".
        let iface = ContractInterface.fromJSON(json);
        this.interfaces.push(iface);

        for (const customTypeName in json.types) {
            let itemJson = json.types[customTypeName];
            let typeDiscriminant = itemJson.type;

            // Workaround: set the "name" field, as required by "fromJSON()" below.
            itemJson.name = customTypeName;

            let customType = this.createCustomType(typeDiscriminant, itemJson);
            this.customTypes.push(customType);
        }

        return this;
    }

    private createCustomType(typeDiscriminant: string, json: any): CustomType {
        if (typeDiscriminant == "struct") {
            return StructType.fromJSON(json);
        }
        if (typeDiscriminant == "enum") {
            return EnumType.fromJSON(json);
        }

        throw new errors.ErrTypingSystem(`Unknown type discriminant: ${typeDiscriminant}`);
    }

    findInterface(name: string): ContractInterface {
        let result = this.interfaces.find(e => e.name == name);
        guardValueIsSetWithMessage(`interface [${name}] not found`, result);
        return result!;
    }

    findInterfaces(names: string[]): ContractInterface[] {
        return names.map(name => this.findInterface(name));
    }
    
    findStruct(name: string): StructType {
        let result = this.customTypes.find(e => e.getName() == name && e instanceof StructType);
        guardValueIsSetWithMessage(`struct [${name}] not found`, result);
        return <StructType>result!;
    }

    findStructs(names: string[]): StructType[] {
        return names.map(name => this.findStruct(name));
    }  

    findEnum(name: string): EnumType {
        let result = this.customTypes.find(e => e.getName() == name && e instanceof EnumType);
        guardValueIsSetWithMessage(`enum [${name}] not found`, result);
        return <EnumType>result!;
    }

    findEnums(names: string[]): EnumType[] {
        return names.map(name => this.findEnum(name));
    }

    /**
     * Right after loading ABI definitions into a registry (e.g. from a file), the endpoints and the custom types (structs, enums)
     * use raw types for their I/O parameters (in the case of endpoints), or for their fields (in the case of structs).
     * 
     * A raw type is merely an instance of {@link BetterType}, with a given name and type parameters (if it's a generic type).
     * 
     * Though, for most (development) purposes, we'd like to operate using known, specific types (e.g. {@link List}, {@link U8Type} etc.).
     * This function increases the specificity of the types used by parameter / field definitions within a registry (on best-efforts basis).
     * The result is an equivalent, more explicit ABI registry.
     */
    remapKnownTypes(): AbiRegistry {
        // TODO: Implement.
        return new AbiRegistry();
    }
}
