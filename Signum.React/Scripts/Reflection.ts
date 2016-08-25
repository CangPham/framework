﻿import * as moment from 'moment';
import { Dic } from './Globals';
import { ModifiableEntity, Entity, Lite, MListElement, ModelState, MixinEntity } from './Signum.Entities';
import {ajaxPost, ajaxGet} from './Services';


export function getEnumInfo(enumTypeName: string, enumId: number) {

    const ti = getTypeInfo(enumTypeName);

    if (!ti || ti.kind != KindOfType.Enum)
        throw new Error(`${enumTypeName} is not an Enum`);

    return ti.membersById![enumId];
}

export interface TypeInfo {
    kind: KindOfType;
    name: string;
    niceName?: string;
    nicePluralName?: string;
    gender?: string;
    entityKind?: EntityKind;
    entityData?: EntityData;
    toStringFunction?: string;
    isLowPopupation?: boolean;
    requiresSaveOperation?: boolean;
    queryDefined?: boolean;
    members: { [name: string]: MemberInfo };
    membersById?: { [name: string]: MemberInfo };

    operations?: { [name: string]: OperationInfo };
}

export interface MemberInfo {
    name: string,
    niceName: string;
    typeNiceName: string;
    type: TypeReference;
    isReadOnly?: boolean;
    isIgnored?: boolean;
    unit?: string;
    format?: string;
    maxLength?: number;
    isMultiline?: boolean;
    preserveOrder?: boolean;
    id?: any; //symbols
}

export interface OperationInfo {
    key: string,
    niceName: string;
    operationType: OperationType;
    allowsNew: boolean;
    lite: boolean;
    hasCanExecute: boolean;
    hasStates: boolean;
}

export enum OperationType {
    Execute = "Execute" as any,
    Delete = "Delete" as any,
    Constructor = "Constructor" as any,
    ConstructorFrom = "ConstructorFrom" as any,
    ConstructorFromMany = "ConstructorFromMany" as any
}

//https://msdn.microsoft.com/en-us/library/az4se3k1%28v=vs.110%29.aspx?f=255&MSPPError=-2147217396
//http://momentjs.com/docs/#/displaying/format/
export function toMomentFormat(format: string | undefined): string | undefined {

    switch (format) {
        case "d": return "L"; // or "l"
        case "D": return "LL";
        case "f":
        case "F": return "LLLL";
        case "g": return "L LT";
        case "G": return "L LTS";
        case "M":
        case "m": return "D MMM";
        case "u":
        case "s": return moment.ISO_8601 as any;
        case "t": return "LT";
        case "T": return "LTS";
        case "y": return "LTS";
        case "Y": return "MMMM YYY";
        default: return format;
    }
}


//https://msdn.microsoft.com/en-us/library/ee372286(v=vs.110).aspx
//https://github.com/jsmreese/moment-duration-format
export function toMomentDurationFormat(format: string | undefined): string | undefined{

    if (format == undefined)
        return undefined;

    return format.replace("\:", ":");
}

export interface TypeReference {
    name: string;
    typeNiceName?: string;
    isCollection?: boolean;
    isLite?: boolean;
    isNotNullable?: boolean;
    isEnum?: boolean;
    isEmbedded?: boolean;
}

export enum KindOfType {
    Entity = "Entity" as any,
    Enum = "Enum" as any,
    Message = "Message" as any,
    Query = "Query" as any,
    SymbolContainer = "SymbolContainer" as any,
}

export enum EntityKind {
    SystemString = "SystemString" as any,
    System = "System" as any,
    Relational = "Relational" as any,
    String = "String" as any,
    Shared = "Shared" as any,
    Main = "Main" as any,
    Part = "Part" as any,
    SharedPart = "SharedPart" as any,
}

export enum EntityData {
    Master = "Master" as any,
    Transactional = "Transactional" as any,
}

export interface TypeInfoDictionary {
    [name: string]: TypeInfo
}

let _types: TypeInfoDictionary = {};


let _queryNames: {
    [queryKey: string]: MemberInfo
};

export type PseudoType = IType | TypeInfo | string;

export function getTypeName(pseudoType: IType | TypeInfo | string): string {
    if ((pseudoType as IType).typeName)
        return (pseudoType as IType).typeName;

    if ((pseudoType as TypeInfo).name)
        return (pseudoType as TypeInfo).name;

    if (typeof pseudoType == "string")
        return pseudoType as string;

    throw new Error("Unexpected pseudoType " + pseudoType);
}

export function isEntity(type: PseudoType): boolean {
    const ti = getTypeInfo(type);
    return ti && !!ti.members["Id"];
}

export function isModel(type: PseudoType): boolean {
    const ti = getTypeInfo(type);
    return ti && !ti.members["Id"];
}

export function isEmbedded(type: PseudoType): boolean {
    const ti = getTypeInfo(type);
    return !ti;
}


export function getTypeInfo(type: PseudoType): TypeInfo {

    if ((type as TypeInfo).kind != undefined)
        return type as TypeInfo;

    if ((type as IType).typeName)
        return _types[((type as IType).typeName).toLowerCase()];

    if (typeof type == "string")
        return _types[(type as string).toLowerCase()];

    throw new Error("Unexpected type: " + type);
}

export function parseId(ti: TypeInfo, id: string): string | number {
    return ti.members["Id"].type.name == "number" ? parseInt(id) : id;
}

export const IsByAll = "[ALL]";
export function getTypeInfos(typeReference: TypeReference): TypeInfo[] {
    if (typeReference.name == IsByAll || typeReference.name == "")
        return [];

    return typeReference.name.split(", ").map(getTypeInfo);

}

export function getQueryNiceName(queryName: PseudoType | QueryKey) {

    if ((queryName as TypeInfo).kind != undefined)
        return (queryName as TypeInfo).nicePluralName;

    if (queryName instanceof Type)
        return (queryName as Type<any>).nicePluralName();

    if (queryName instanceof QueryKey)
        return (queryName as QueryKey).niceName();

    if (typeof queryName == "string") {
        const str = queryName as string;

        const type = _types[str.toLowerCase()];
        if (type)
            return type.nicePluralName;

        const qn = _queryNames[str.toLowerCase()];
        if (qn)
            return qn.niceName;

        return str;
    }

    throw new Error("unexpected queryName type");

}

export function getQueryInfo(queryName: PseudoType | QueryKey): MemberInfo | TypeInfo {
    if (queryName instanceof QueryKey) {
        return queryName.memberInfo();
    }
    else {
        const ti = getTypeInfo(queryName);
        if (ti)
            return ti;

        const mi = _queryNames[(queryName as string).toLowerCase()];

        if (mi)
            return mi;

        throw Error("Unexpected query type");
    }
}

export function getQueryKey(queryName: PseudoType | QueryKey): string {
    if ((queryName as TypeInfo).kind != undefined)
        return (queryName as TypeInfo).name;

    if (queryName instanceof Type)
        return (queryName as Type<any>).typeName;

    if (queryName instanceof QueryKey)
        return (queryName as QueryKey).name;

    if (typeof queryName == "string") {
        const str = queryName as string;

        const type = _types[str.toLowerCase()];
        if (type)
            return type.name;

        const qn = _queryNames[str.toLowerCase()];
        if (qn)
            return qn.name;

        return str;
    }

    throw Error("Unexpected query type");
}

export function isQueryDefined(queryName: PseudoType | QueryKey): boolean {
    if ((queryName as TypeInfo).kind != undefined)
        return (queryName as TypeInfo).queryDefined || false;

    if (queryName instanceof Type)
        return getTypeInfo(queryName).queryDefined || false;

    if (queryName instanceof QueryKey)
        return !!_queryNames[queryName.name.toLowerCase()];

    if (typeof queryName == "string") {
        const str = queryName as string;

        const type = _types[str.toLowerCase()];
        if (type) {
            return type.queryDefined || false;
        }

        const qn = _queryNames[str.toLowerCase()];

        return !!qn;
    }

    return false;
}

export function reloadTypes(): Promise<void> {
    return ajaxGet<TypeInfoDictionary>({ url: "~/api/reflection/types" })
        .then(types => setTypes(types));
}

export function setTypes(types: TypeInfoDictionary) {

    Dic.foreach(types, (k, t) => {
        t.name = k;
        if (t.members) {
            Dic.foreach(t.members, (k2, t2) => t2.name = k2);
            Object.freeze(t.members);

            if (t.kind == KindOfType.Enum) {
                t.membersById = Dic.getValues(t.members).toObject(a => a.name);
                Object.freeze(t.membersById);
            }
        }

        if (t.requiresSaveOperation == undefined && t.entityKind)
            t.requiresSaveOperation = calculateRequiresSaveOperation(t.entityKind);

        Object.freeze(t);
    });

    _types = Dic.getValues(types).toObject(a => a.name.toLowerCase());
    Object.freeze(_types);

    Dic.foreach(types, (k, t) => {
        if (t.operations) {
            Dic.foreach(t.operations, (k2, t2) => {
                t2.key = k2;
                t2.niceName = _types[k2.before(".").toLowerCase()].members[k2.after(".")].niceName;
            });

            Object.freeze(t.operations);
        }
    });

    _queryNames = Dic.getValues(types).filter(t => t.kind == KindOfType.Query)
        .flatMap(a => Dic.getValues(a.members))
        .toObject(m => m.name.toLocaleLowerCase(), m => m);

    Object.freeze(_queryNames);

    missingSymbols = missingSymbols.filter(s => !setSymbolId(s));
}


function calculateRequiresSaveOperation(entityKind: EntityKind): boolean 
{
    switch (entityKind) {
        case EntityKind.SystemString: return false;
        case EntityKind.System: return false;
        case EntityKind.Relational: return false;
        case EntityKind.String: return true;
        case EntityKind.Shared: return true;
        case EntityKind.Main: return true;
        case EntityKind.Part: return false;
        case EntityKind.SharedPart: return false;
        default: throw new Error("Unexpeced entityKind");
    }
}

export interface IBinding<T> {
    getValue(): T;
    setValue(val: T): void;
    suffix: string;
    getError(): string | undefined;
    setError(value: string | undefined): void;
}

export class Binding<T> implements IBinding<T> {

    initialValue: T; // For deep compare

    constructor(
        public parentValue: any,
        public member: string | number) {
        this.initialValue = this.parentValue[member];
    }

    static create<F, T>(parentValue: F, fieldAccessor: (from: F) => T) {
        const members = getLambdaMembers(fieldAccessor);

        if (members.length != 1 || members[0].type != LambdaMemberType.Member)
            throw Error("invalid function 'fieldAccessor'");

        return new Binding<T>(parentValue, members[0].name);
    }

    get suffix() {
        return this.member.toString();
    }

    getValue(): T {

        if (!this.parentValue)
            throw new Error(`Impossible to get '${this.member}' from '${this.parentValue}'`); 

        return this.parentValue[this.member];
    }
    setValue(val: T) {

        if (!this.parentValue)
            throw new Error(`Impossible to set '${this.member}' from '${this.parentValue}'`);

        const oldVal = this.parentValue[this.member];
        this.parentValue[this.member] = val;

        if (oldVal != val && (this.parentValue as ModifiableEntity).Type) {
            (this.parentValue as ModifiableEntity).modified = true;
        }
    }

    getError(): string | undefined {
        const parentErrors = (this.parentValue as ModifiableEntity).error;
        return parentErrors && parentErrors[this.member];
    }

    setError(value: string | undefined) {
        const parent = this.parentValue as ModifiableEntity;

        if (!value) {

            if (parent.error)
                delete parent.error[this.member];


        } else {
            if (!parent.Type)
                return;

            if (!parent.error)
                parent.error = {};

            parent.error[this.member] = value;

        }
    }
}

export class ReadonlyBinding<T> implements IBinding<T> {
    constructor(
        public value: T,
        public suffix: string) {
    }

    getValue() {
        return this.value;
    }
    setValue(val: T) {
        throw new Error("Readonly Binding");
    }

    getError(): string | undefined {
        return undefined;
    }

    setError(name: string | undefined): void {        
    }
}

export function createBinding<T>(parentValue: any, lambda: (obj: any) => T): IBinding<T> {

    const lambdaMatch = functionRegex.exec((lambda as any).toString());

    if (lambdaMatch == undefined)
        throw Error("invalid function");

    const parameter = lambdaMatch[1];
    let body = lambdaMatch[3];

    if (parameter == body)
        return new ReadonlyBinding<T>(parentValue as T, "");

    body = body.replace(partialMixinRegex,
        (...m: string[]) => `${m[2]}.mixins["${m[4]}"]`);

    const m = memberRegex.exec(body);

    if (m == undefined) {
        const realParentValue = eval(`(function(${parameter}){ return ${body};})`)(parentValue);

        return new ReadonlyBinding<T>(realParentValue as T, "");
    }

    let newBody = m[1];

    const realParentValue = m[1] == parameter ? parentValue :
        eval(`(function(${parameter}){ return ${newBody};})`)(parentValue);

    return new Binding<T>(realParentValue, m[2]);
}


const functionRegex = /^function\s*\(\s*([$a-zA-Z_][0-9a-zA-Z_$]*)\s*\)\s*{\s*(\"use strict\"\;)?\s*return\s*(.*)\s*;\s*}$/;
const memberRegex = /^(.*)\.([$a-zA-Z_][0-9a-zA-Z_$]*)$/;
const indexRegex = /^(.*)\[(\d+)\]$/;
const mixinRegex = /^(.*?\.?)getMixin\((.*),\s*(.*?\.?)([$a-zA-Z_][0-9a-zA-Z_$]*)\s*\)$/
const partialMixinRegex = /(.*?\.?)getMixin\((.*),\s*(.*?\.?)([$a-zA-Z_][0-9a-zA-Z_$]*)\s*\)/

export function getLambdaMembers(lambda: Function): LambdaMember[]{
    
    const lambdaMatch = functionRegex.exec((lambda as any).toString());

    if (lambdaMatch == undefined)
        throw Error("invalid function");

    const parameter = lambdaMatch[1];
    let body = lambdaMatch[3];
    let result: LambdaMember[] = [];

    while (body != parameter) {
        let m: RegExpExecArray | null;
        if (m = memberRegex.exec(body)) {
            result.push({ name: m[2], type: LambdaMemberType.Member });
            body = m[1];
        }
        else if (m = indexRegex.exec(body)) {
            result.push({ name: m[2], type: LambdaMemberType.Indexer });
            body = m[1];
        }
        else if (m = mixinRegex.exec(body)) {
            result.push({ name: m[4], type: LambdaMemberType.Mixin });
            body = m[2];
        } else {
            throw new Error(`Unexpected body in Property Route ${body}`);
        }
    }

    result = result.reverse();

    result = result.filter((m, i) => !(m.type == LambdaMemberType.Member && m.name == "element" && i > 0 && result[i - 1].type == LambdaMemberType.Indexer));

    return result;
}


export interface LambdaMember {
    name: string;
    type: LambdaMemberType
}

export enum LambdaMemberType {
    Member = "Member" as any,
    Mixin = "Mixin" as any,
    Indexer = "Indexer" as any,
}

export function basicConstruct(type: PseudoType): ModifiableEntity {

    const ti = getTypeInfo(type);

    const result = { Type: getTypeName(type), isNew: true, modified: true } as any as ModifiableEntity;

    if (ti) {

        var e = result as Entity;

        const mixins = Dic.getKeys(ti.members)
            .filter(a => a.startsWith("["))
            .groupBy(a => a.after("[").before("]"))
            .forEach(gr => {

                var m = ({ Type: gr.key, isNew: true, modified: true, }) as MixinEntity;

                if (!e.mixins)
                    e.mixins = {};

                e.mixins[gr.key] = m;
            });

        Dic.getValues(ti.members).filter(a => a.type.isCollection).forEach(m => (result as any)[m.name.firstLower()] = []); //TODO: Collections in Embeddeds...
    }

    return result;
}

export interface IType {
    typeName: string;
}

export class Type<T extends ModifiableEntity> implements IType {

    New(modify?: (entity: T) => void): T {

        const result =  basicConstruct(this.typeName) as T;

        if (modify)
            modify(result);

        return result;
    }

    constructor(
        public typeName: string) { }

    tryTypeInfo(): TypeInfo {
        return getTypeInfo(this.typeName);
    }

    typeInfo(): TypeInfo {

        const result = this.tryTypeInfo();

        if (!result)
            throw new Error(`Type ${this.typeName} has no TypeInfo. Maybe is an embedded?`);

        return result;
    }

    memberInfo(lambdaToProperty: (v: T) => any): MemberInfo {
        var pr = this.propertyRoute(lambdaToProperty);

        if (!pr.member)
            throw new Error(`${pr.propertyPath()} has no member`);

        return pr.member;
    }

    propertyRoute(lambdaToProperty: (v: T) => any): PropertyRoute {
        return PropertyRoute.root(this.typeInfo()).add(lambdaToProperty);
    }

    niceName(): string {
        const ti = this.typeInfo();

        if (!ti.niceName)
            throw new Error(`no niceName found for ${ti.name}`);

        return ti.niceName;
    }

    nicePluralName(): string {
        const ti = this.typeInfo();

        if (!ti.nicePluralName)
            throw new Error(`no nicePluralName found for ${ti.name}`);

        return ti.nicePluralName;
    }

    nicePropertyName(lambdaToProperty: (v: T) => any): string  {
        const member = this.memberInfo(lambdaToProperty);

        if (!member.niceName)
            throw new Error(`no nicePropertyName found for ${member.name}`);

        return member.niceName;
    }
}

export class EnumType<T extends string> {
    constructor(public type: string) { }

    typeInfo(): TypeInfo {
        return getTypeInfo(this.type);
    }

    values(): T[] {
        return Dic.getKeys(this.typeInfo().members) as T[];
    }

    niceName(value?: T): string | undefined {

        if (value == undefined)
            return this.typeInfo().niceName;

        return this.typeInfo().members[value as string].niceName;
    }
}

export class MessageKey {

    constructor(
        public type: string,
        public name: string) { }

    propertyInfo(): MemberInfo {
        return getTypeInfo(this.type).members[this.name]
    }

    niceToString(...args: any[]): string {
        const msg = this.propertyInfo().niceName;

        return args.length ? msg.formatWith(...args) : msg;
    }
}

export class QueryKey {

    constructor(
        public type: string,
        public name: string) { }

    memberInfo(): MemberInfo {
        return getTypeInfo(this.type).members[this.name]
    }

    niceName(): string {
        return this.memberInfo().niceName;
    }
}

interface ISymbol {
    Type: string; 
    key: string;
    id?: any;
}

let missingSymbols: ISymbol[] = [];

function setSymbolId(s: ISymbol): boolean {

    const type = _types[s.key.before(".").toLowerCase()];

    if (!type)
        return false;

    const member = type.members[s.key.after(".")];

    if (!member)
        return false;

    const key = s.key;
    delete s.key;

    s.id = member.id;

    s.key = key; //Key should be after id


    return true;
}


export function registerSymbol<T extends ISymbol>(symbol: T): any {

    if (!setSymbolId(symbol))
        missingSymbols.push(symbol);

    return symbol as any;
}

export class PropertyRoute {
    
    propertyRouteType: PropertyRouteType;
    parent?: PropertyRoute; //!Root
    rootType?: TypeInfo; //Root
    member?: MemberInfo; //Member
    mixinName?: string; //Mixin

    static root(type: PseudoType) {
        const typeInfo = getTypeInfo(type);
        if (!typeInfo) {
            throw Error(`No TypeInfo for "${getTypeName(type)}" found. Consider calling ReflectionServer.RegisterLike on the server side.`);
        }
        return new PropertyRoute(undefined, PropertyRouteType.Root, typeInfo, undefined, undefined);
    }

    static member(parent: PropertyRoute, member: MemberInfo) {
        return new PropertyRoute(parent, PropertyRouteType.Field, undefined, member, undefined);
    }

    static mixin(parent: PropertyRoute, mixinName: string) {
        return new PropertyRoute(parent, PropertyRouteType.Mixin, undefined, undefined, mixinName);
    }

    static mlistItem(parent: PropertyRoute) {
        return new PropertyRoute(parent, PropertyRouteType.MListItem, undefined, undefined, undefined);
    }

    static liteEntity(parent: PropertyRoute) {
        return new PropertyRoute(parent, PropertyRouteType.LiteEntity, undefined, undefined, undefined);
    }

    constructor(
        parent: PropertyRoute | undefined,
        propertyRouteType: PropertyRouteType,
        rootType: TypeInfo | undefined,
        member: MemberInfo | undefined,
        mixinName: string | undefined) {

        this.propertyRouteType = propertyRouteType;
        this.parent = parent;
        this.rootType = rootType;
        this.member = member;
        this.mixinName = mixinName;
    }

    add(property: (val: any) => any): PropertyRoute {
        const members = getLambdaMembers(property);

        let current: PropertyRoute = this;
        members.forEach(m=> current = current.addMember(m));

        return current;
    }

    findRootType(): TypeInfo {
        return this.rootType || this.parent!.findRootType();
    }

    typeReference(): TypeReference {
        switch (this.propertyRouteType) {
            case PropertyRouteType.Root: return { name: this.rootType!.name };
            case PropertyRouteType.Field: return this.member!.type;
            case PropertyRouteType.Mixin: throw new Error("mixins can not be used alone");
            case PropertyRouteType.MListItem: return Dic.extend({}, this.parent!.typeReference(), { isCollection: false });
            case PropertyRouteType.LiteEntity: return Dic.extend({}, this.parent!.typeReference(), { isLite: false });
            default: throw new Error("Unexpected propertyRouteType");
        }
    }

    typeReferenceInfo(): TypeInfo {
        return getTypeInfo(this.typeReference().name);
    }

    closestTypeInfo(): TypeInfo {
        switch (this.propertyRouteType) {
            case PropertyRouteType.Root: return this.rootType!;
            case PropertyRouteType.Field: return this.parent!.closestTypeInfo();
            case PropertyRouteType.Mixin: return this.parent!.closestTypeInfo();
            case PropertyRouteType.MListItem: return this.parent!.closestTypeInfo();
            case PropertyRouteType.LiteEntity: return this.parent!.closestTypeInfo();
            default: throw new Error("Unexpected propertyRouteType");
        }
    }

    propertyPath(): string {
        switch (this.propertyRouteType) {
            case PropertyRouteType.Root: throw new Error("Root has no PropertyString");
            case PropertyRouteType.Field: return this.member!.name;
            case PropertyRouteType.Mixin: return "[" + this.mixinName + "]";
            case PropertyRouteType.MListItem: return this.parent!.propertyPath() + "/";
            case PropertyRouteType.LiteEntity: return this.parent!.propertyPath() + ".entity";
            default: throw new Error("Unexpected propertyRouteType");
        }
    }

    addMember(member: LambdaMember): PropertyRoute {

        if (member.type == LambdaMemberType.Member) {

            if (this.propertyRouteType == PropertyRouteType.Field) {
                const ref = this.typeReference();

                if (ref.isLite) {
                    if (member.name != "entity")
                        throw new Error("Entity expected");

                    return PropertyRoute.liteEntity(this);
                }
          
                const ti = getTypeInfos(ref).single("Ambiguity due to multiple Implementations");
                if (ti) {
                    const memberName = member.name.firstUpper();
                    const m = ti.members[memberName];
                    if (!m)
                        throw new Error(`member '${memberName}' not found`);

                    return PropertyRoute.member(PropertyRoute.root(ti), m);
                }
            }

            const memberName = this.propertyRouteType == PropertyRouteType.Root ? member.name.firstUpper() :
                this.propertyRouteType == PropertyRouteType.MListItem ? this.propertyPath() + member.name.firstUpper() :
                    this.propertyPath() + "." + member.name.firstUpper();

            const m = this.closestTypeInfo().members[memberName];
            if (!m)
                throw new Error(`member '${memberName}' not found`)

            return PropertyRoute.member(this, m);
        }

        if (member.type == LambdaMemberType.Mixin) {
            if (this.propertyRouteType != PropertyRouteType.Root)
                throw new Error("invalid mixin at this stage");

            return PropertyRoute.mixin(this, member.name);
        }


        if (member.type == LambdaMemberType.Indexer) {
            if (this.propertyRouteType != PropertyRouteType.Field)
                throw new Error("invalid mixin at this stage");

            return PropertyRoute.mlistItem(this);
        }

        throw new Error("not implemented");
    }

    subMembers(): { [subMemberName: string]: MemberInfo } {

        const type = this.closestTypeInfo();

        function containsDotOrSlash(name: string) {
            return name.contains(".") || name.contains("/");
        }

        switch (this.propertyRouteType) {
            case PropertyRouteType.Root: return Dic.getValues(type.members).filter(m => !containsDotOrSlash(m.name)).toObject(m => m.name);
            case PropertyRouteType.Mixin:
                
            case PropertyRouteType.MListItem: 
                {
                    const path = this.propertyPath();
                    return Dic.getValues(type.members)
                        .filter(m => m.name != path && m.name.startsWith(path))
                        .filter(m => !containsDotOrSlash(m.name.substring(path.length)))
                        .toObject(m => m.name.substring(path.length));
                }
            case PropertyRouteType.LiteEntity:
            case PropertyRouteType.Field:
                {
                    const member = this.member!;
                    return Dic.getValues(type.members)
                        .filter(m => m.name.startsWith(member.name + "."))
                        .filter(m => !containsDotOrSlash(m.name.substring(member.name.length + 1)))
                        .toObject(m => m.name.substring(member.name.length + 1));
                }
            default: throw new Error("Unexpected propertyRouteType");

        }
    }

    toString() {
        if (this.propertyRouteType == PropertyRouteType.Root)
            return `(${this.findRootType().name})`;

        return `(${this.findRootType().name}).${this.propertyPath()}`;
    }
}

export enum PropertyRouteType {
    Root = "Root" as any,
    Field = "Field" as any,
    Mixin = "Mixin" as any,
    LiteEntity = "LiteEnity" as any,
    MListItem = "MListItem" as any,
}


export class GraphExplorer {

    static propagateAll(...args: any[]) {
        const ge = new GraphExplorer();
        ge.modelStateMode = "clean";
        args.forEach(o => ge.isModified(o, ""));
    }

    static setModelState(e: ModifiableEntity, modelState: ModelState | undefined, initialPrefix: string) {
        const ge = new GraphExplorer();
        ge.modelStateMode = "set";
        ge.modelState = modelState == undefined ? {} : Dic.copy(modelState);
        ge.isModifiableObject(e, initialPrefix);
        if (Dic.getValues(ge.modelState).length) //Assign remaining
            e.error = Dic.extend(e.error || {}, ge.modelState);
    }

    static collectModelState(e: ModifiableEntity, initialPrefix: string): ModelState {
        const ge = new GraphExplorer();
        ge.modelStateMode = "collect";
        ge.modelState = {};
        ge.isModifiableObject(e, initialPrefix);
        return ge.modelState;
    }

    //cycle detection
    private modified : any[] = [];
    private notModified: any[] = [];

    private modelStateMode: "collect" | "set" | "clean";

    private modelState: ModelState;


    isModified(obj: any, modelStatePrefix: string): boolean {

        if (obj == undefined)
            return false;

        const t = typeof obj;
        if (t != "object")
            return false;

        if (this.modified.contains(obj))
            return true;

        if (this.notModified.contains(obj))
            return false;

        const result = this.isModifiableObject(obj, modelStatePrefix);

        (result ? this.modified : this.notModified).push(obj);

        return result;
    }

    private static specialProperties = ["Type", "id", "isNew", "ticks", "toStr", "modified"];

    private isModifiableObject(obj: any, modelStatePrefix: string) {

        if (obj instanceof Date)
            return false;

        if (obj instanceof Array)
            return (obj as Array<any>).map((o, i) => this.isModified(o, modelStatePrefix + "[" + i + "]")).some(a => a);

        const mle = obj as MListElement<any>;
        if (mle.hasOwnProperty("rowId"))
            return this.isModified(mle.element, dot(modelStatePrefix, "element")) || mle.rowId == undefined;

        const lite = obj as Lite<Entity>
        if (lite.EntityType)
            return lite.entity != undefined && this.isModified(lite.entity, dot(modelStatePrefix, "entity"));

        const mod = obj as ModifiableEntity;
        if (mod.Type == undefined) {
            let result = false;
            for (const p in obj) {
                if (obj.hasOwnProperty(p)) {
                    const propertyPrefix = dot(modelStatePrefix, p);
                    result = this.isModified(obj[p], propertyPrefix) || result;
                }
            }

            return result;
        }

        if (this.modelStateMode == "collect") {
            if (mod.error != undefined) {
                for (const p in mod.error) {
                    const propertyPrefix = dot(modelStatePrefix, p);

                    if (mod.error[p])
                        this.modelState[dot(modelStatePrefix, p)] = mod.error[p];
                }
            }
        }
        else if (this.modelStateMode == "set") {

            mod.error = undefined;

            const prefix = dot(modelStatePrefix, "");
            for (const key in this.modelState) {
                const propName = key.tryAfter(prefix)
                if (propName && !propName.contains(".")) {
                    if (mod.error == undefined)
                        mod.error = {};

                    mod.error[propName] = this.modelState[key];

                    delete this.modelState[key];
                }
            }

            if (mod.error == undefined)
                delete mod.error;
        }
        else if (this.modelStateMode == "clean") {
            delete mod.error;
        }

        
        for (const p in obj) {
            if (obj.hasOwnProperty(p) && !GraphExplorer.specialProperties.contains(p)) {
                const propertyPrefix = dot(modelStatePrefix, p);
                if (this.isModified(obj[p], propertyPrefix))
                    mod.modified = true;
            }
        }

        if ((mod as Entity).isNew)
            mod.modified = true;
      
        return mod.modified;
    }
}

function dot(prev: string, property: string) {
    if (prev == undefined || prev == "")
        return property;

    return prev + "." + property
}

