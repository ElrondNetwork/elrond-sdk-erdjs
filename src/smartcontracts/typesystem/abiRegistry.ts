import * as errors from "../../errors";
import { guardValueIsSetWithMessage } from "../../utils";
import { StructType } from "./struct";
import { ContractInterface } from "./contractInterface";
import { CustomType } from "./types";
import { EnumType } from "./enum";
import { TypeMapper } from "./typeMapper";
import { EndpointDefinition, EndpointParameterDefinition } from "./endpoint";

export class AbiRegistry {
    readonly interfaces: ContractInterface[] = [];
    private customTypes: CustomType[] = [];

    static create(json: { name: string; endpoints: any[]; types: any[] }): AbiRegistry {
        let registry = new AbiRegistry().extend(json);
        let remappedRegistry = registry.remapToKnownTypes();
        return remappedRegistry;
    }

    private extend(json: { name: string; endpoints: any[]; types: any[] }): AbiRegistry {
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

        this.sortCustomTypesByDependencies();

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

    private sortCustomTypesByDependencies() {
        // Use of topological sort algorithm to sort custom types by dependencies.
        let dependencies: { [key: string]: string[] } = {};
        let visited: { [key: string]: boolean } = {};
        this.customTypes.forEach((type: CustomType) => {
            dependencies[type.getName()] = type.getNamesOfDependencies();
            visited[type.getName()] = false;
        });
        let sortedArray = new Array<CustomType>();

        const topologicalSortUtil = (name: string, visited: { [key: string]: boolean }, sortedArray: CustomType[]) => {
            visited[name] = true;

            for (const dependency of dependencies[name]) {
                if (!this.customTypes.find((e) => e.getName() == dependency)) continue;
                if (!visited[dependency]) {
                    topologicalSortUtil(dependency, visited, sortedArray);
                }
            }
            const type = this.customTypes.find((e) => e.getName() == name);
            if (type) {
                sortedArray.push(type);
            }
        };

        for (const type of this.customTypes) {
            if (!visited[type.getName()]) {
                topologicalSortUtil(type.getName(), visited, sortedArray);
            }
        }

        this.customTypes = sortedArray;
    }

    getInterface(name: string): ContractInterface {
        let result = this.interfaces.find((e) => e.name == name);
        guardValueIsSetWithMessage(`interface [${name}] not found`, result);
        return result!;
    }

    getInterfaces(names: string[]): ContractInterface[] {
        return names.map((name) => this.getInterface(name));
    }

    getStruct(name: string): StructType {
        let result = this.customTypes.find((e) => e.getName() == name && e.hasExactClass(StructType.ClassName));
        guardValueIsSetWithMessage(`struct [${name}] not found`, result);
        return <StructType>result!;
    }

    getStructs(names: string[]): StructType[] {
        return names.map((name) => this.getStruct(name));
    }

    getEnum(name: string): EnumType {
        let result = this.customTypes.find((e) => e.getName() == name && e.hasExactClass(EnumType.ClassName));
        guardValueIsSetWithMessage(`enum [${name}] not found`, result);
        return <EnumType>result!;
    }

    getEnums(names: string[]): EnumType[] {
        return names.map((name) => this.getEnum(name));
    }

    /**
     * Right after loading ABI definitions into a registry, the endpoints and the custom types (structs, enums)
     * use raw types for their I/O parameters (in the case of endpoints), or for their fields (in the case of structs).
     *
     * A raw type is merely an instance of {@link Type}, with a given name and type parameters (if it's a generic type).
     *
     * Though, for most (development) purposes, we'd like to operate using known, specific types (e.g. {@link List}, {@link U8Type} etc.).
     * This function increases the specificity of the types used by parameter / field definitions within a registry (on best-efforts basis).
     * The result is an equivalent, more explicit ABI registry.
     */
    remapToKnownTypes(): AbiRegistry {
        let mapper = new TypeMapper([]);
        let newCustomTypes: CustomType[] = [];
        let newInterfaces: ContractInterface[] = [];

        // First, remap custom types (actually, under the hood, this will remap types of struct fields)
        for (const type of this.customTypes) {
            const mappedTyped = mapper.mapType(type);
            newCustomTypes.push(mappedTyped);
        }

        // Then, remap types of all endpoint parameters.
        // But we'll use an enhanced mapper, that takes into account the results from the previous step.
        mapper = new TypeMapper(newCustomTypes);
        for (const iface of this.interfaces) {
            let newEndpoints: EndpointDefinition[] = [];
            for (const endpoint of iface.endpoints) {
                newEndpoints.push(mapEndpoint(endpoint, mapper));
            }
            let newConstructor = iface.constructorDefinition ? mapEndpoint(iface.constructorDefinition, mapper) : null;
            newInterfaces.push(new ContractInterface(iface.name, newConstructor, newEndpoints));
        }

        // Now return the new registry, with all types remapped to known types
        let newRegistry = new AbiRegistry();
        newRegistry.customTypes.push(...newCustomTypes);
        newRegistry.interfaces.push(...newInterfaces);

        return newRegistry;
    }
}

function mapEndpoint(endpoint: EndpointDefinition, mapper: TypeMapper): EndpointDefinition {
    let newInput = endpoint.input.map(
        (e) => new EndpointParameterDefinition(e.name, e.description, mapper.mapType(e.type))
    );
    let newOutput = endpoint.output.map(
        (e) => new EndpointParameterDefinition(e.name, e.description, mapper.mapType(e.type))
    );
    return new EndpointDefinition(endpoint.name, newInput, newOutput, endpoint.modifiers);
}
