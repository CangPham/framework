﻿/// <reference path="globals.ts" />

import {ajaxPost, ajaxGet} from 'Framework/Signum.React/Scripts/Services';

export class PropertyRoute {

    parent: PropertyRoute;

    add(property: (val: any) => any): PropertyRoute {
        return null;
    } 
}

export function getEnumInfo(enumTypeName: string, enumId: number) {

    var ti = typeInfo(enumTypeName);

    if (!ti || ti.kind != KindOfType.Enum)
        throw new Error(`${enumTypeName} is not an Enum`);

    if (!ti.membersById)
        ti.membersById = Dic.getValues(ti.members).toObject(a=> a.id);

    return ti.membersById[enumId];
}

export interface TypeInfo
{
    kind: KindOfType;
    name: string;
    niceName?: string;
    nicePluralName?: string;
    gender?: string;
    entityKind?: EntityKind;
    entityData?: EntityData;
    members?: { [name: string]: MemberInfo };
    membersById?: { [name: string]: MemberInfo };
    mixins?: { [name: string]: string };
}

export interface MemberInfo {
    name: string,
    niceName: string;
    type: TypeReference;
    unit?: string; 
    format?: string; 
    id?: any; //symbols
}

export interface TypeReference {
    isCollection?: boolean;
    isLite?: boolean;
    isNullable?: boolean;
    type?: string;
}

export enum KindOfType {
    Entity,
    Enum,
    Message,
    Query,
    SymbolContainer, 
}

export enum EntityKind {
    SystemString,
    System,
    Relational,
    String,
    Shared,
    Main,
    Part,
    SharedPart,
}

export enum EntityData {
    Master,
    Transactional
}

interface TypeInfoDictionary {
    [name: string]: TypeInfo
}

var _types: TypeInfoDictionary;


export const  IsByAll = "[ALL]";

export function typeInfo(name: string): TypeInfo {
    return _types[name];
}

export function loadTypes(): Promise<void> {

    return ajaxGet<TypeInfoDictionary>({ url: "/api/reflection/types" }).then((types) => {

        _types = types;

        earySymbols.forEach(s=> setSymbolId(s));

        earySymbols = null;
    });
}



export function lambdaBody(lambda: Function): string
{
    return lambda.toString().after("return ").after(".").before(";");
}

export interface IType {
    typeName: string;
}

export class Type<T> implements IType {
    constructor(
        public typeName: string) { }

    typeInfo(): TypeInfo {
        return typeInfo(this.typeName);
    }

    propertyInfo(lambdaToProperty: (v: T) => any): MemberInfo {
        return this.typeInfo().members[lambdaBody(lambdaToProperty)];
    }

    niceName() {
        return this.typeInfo().niceName;
    }

    nicePluralName() {
        return this.typeInfo().nicePluralName;
    }

    nicePropertyName(lambdaToProperty: (v: T) => any): string {
        return this.propertyInfo(lambdaToProperty).niceName;
    } 
}


export class EnumType<T> {
    constructor(
        public type: string,
        public converter: { [value: number]: string }
        ) { }

    typeInfo(): TypeInfo {
        return typeInfo(this.type);
    }

    niceName(value?: T): string {

        if (value == null)
            return this.typeInfo().niceName;

        var valueStr = this.converter[<any>value];

        return this.typeInfo().members[valueStr].niceName;
    }
}

export class MessageKey {

    constructor(
        public type: string,
        public name: string) { }

    propertyInfo(): MemberInfo {
        return typeInfo(this.type).members[this.name] 
    }

    niceToString(): string {
        return this.propertyInfo().niceName;
    }
}

export class QueryKey {

    constructor(
        public type: string,
        public name: string) { }

    propertyInfo(): MemberInfo {
        return typeInfo(this.type).members[this.name] 
    }

    niceName(): string {
        return this.propertyInfo().niceName;
    }
}

interface ISymbol {
    key?: string;
    id?: any;
}

var earySymbols: ISymbol[] = [];

function setSymbolId(s: ISymbol) {

    var type = _types[s.key.before(".")];

    if (!type)
        return;

    var member = type.members[s.key.after(".")];

    if (!member)
        return

    s.id = s.id;
}


export function registerSymbol<T extends ISymbol>(symbol: T): T {

    if (_types)
        setSymbolId(symbol);
    else
        earySymbols.push(symbol);

    return symbol;
} 