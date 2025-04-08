import {
  DirectiveLocation,
  Document,
  EnumTypeExtension,
  ExecutableDefinition,
  InputObjectTypeExtension,
  InterfaceTypeExtension,
  ObjectTypeExtension,
  OperationType,
  ArgumentsDefinition as ParserArgumentsDefinition,
  Directive as ParserDirective,
  DirectiveDefinition as ParserDirectiveDefinition,
  EnumTypeDefinition as ParserEnumTypeDefinition,
  FieldDefinition as ParserFieldDefinition,
  FieldsDefinition as ParserFieldsDefinition,
  InputObjectTypeDefinition as ParserInputObjectTypeDefinition,
  InterfaceTypeDefinition as ParserInterfaceTypeDefinition,
  ObjectTypeDefinition as ParserObjectTypeDefinition,
  ScalarTypeDefinition as ParserScalarTypeDefinition,
  TypeDefinition as ParserTypeDefinition,
  UnionTypeDefinition as ParserUnionTypeDefinition,
  ScalarTypeExtension,
  SchemaDefinition,
  SchemaExtension,
  Type,
  TypeExtension,
  TypeSystemDefinition,
  TypeSystemDefinitionOrExtension,
  TypeSystemExtension,
  UnionTypeExtension,
  Value,
} from "@typed-gql/parser";

export interface Error {
  isError: true;
  message: string;
}

export type DirectiveLocationMap = Partial<Record<DirectiveLocation, true>>;

export type ArgumentsDefinition = Partial<Record<string, InputValueDefinition>>;

export interface Argument {
  name: string;
  value: Value;
}

export type Arguments = Partial<Record<string, Argument>>;

export interface Directive {
  name: string;
  arguments: Arguments;
}

export type DirectiveDefinitions = Partial<Record<string, DirectiveDefinition>>;

export interface DirectiveDefinition {
  description: string | undefined;
  name: string;
  argumentsDefinition: ArgumentsDefinition;
  repeatable: boolean;
  locations: DirectiveLocationMap;
}

export type TypeDefinitions = Partial<Record<string, TypeDefinition>>;

export interface TypeDefinitionBase {
  name: string;
  description: string | undefined;
  directives: Directive[];
}

export interface ScalarTypeDefinition extends TypeDefinitionBase {
  type: "scalar";
}

export interface FieldDefinition {
  description: string | undefined;
  name: string;
  argumentsDefinition: ArgumentsDefinition;
  type: Type;
  directives: Directive[];
}

export type FieldsDefinition = Partial<Record<string, FieldDefinition>>;

export interface ObjectTypeDefinition extends TypeDefinitionBase {
  type: "object";
  implementsInterfaces: string[];
  fieldsDefinition: FieldsDefinition;
}

export interface InterfaceTypeDefinition extends TypeDefinitionBase {
  type: "interface";
  implementsInterfaces: string[];
  fieldsDefinition: FieldsDefinition;
}

export interface UnionTypeDefinition extends TypeDefinitionBase {
  type: "union";
  unionMemberTypes: string[];
}

export interface EnumValueDefinition {
  name: string;
  description: string | undefined;
  directives: Directive[];
}

export type EnumValuesDefinition = Partial<Record<string, EnumValueDefinition>>;

export interface EnumTypeDefinition extends TypeDefinitionBase {
  type: "enum";
  enumValuesDefinition: EnumValuesDefinition;
}

export interface InputValueDefinition {
  name: string;
  description: string | undefined;
  type: Type;
  defaultValue: Value | undefined;
  directives: Directive[];
}

export type InputFieldsDefinition = Partial<
  Record<string, InputValueDefinition>
>;

export interface InputObjectTypeDefinition extends TypeDefinitionBase {
  type: "inputObject";
  inputFieldsDefinition: InputFieldsDefinition;
}

export type TypeDefinition =
  | ScalarTypeDefinition
  | ObjectTypeDefinition
  | InterfaceTypeDefinition
  | UnionTypeDefinition
  | EnumTypeDefinition
  | InputObjectTypeDefinition;

export interface Schema {
  isError: false;
  description: string | undefined;
  rootOperationTypes: Partial<Record<OperationType, string>>;
  schemaDirectives: Directive[];
  directiveDefinitions: DirectiveDefinitions;
  typeDefinitions: TypeDefinitions;
}

export interface SelectionSetItemBase {
  directives: Directive[];
}

export interface SelectionSetItemField extends SelectionSetItemBase {
  type: "field";
  alias: string | undefined;
  name: string;
  arguments: Arguments;
  selectionSet: SelectionSetItem[];
}

export interface SelectionSetItemFragmentSpread extends SelectionSetItemBase {
  type: "fragmentSpread";
  name: string;
}

export interface SelectionSetItemInlineFragment extends SelectionSetItemBase {
  type: "inlineFragment";
  typeCondition: string | undefined;
  selectionSet: SelectionSetItem[];
}

export type SelectionSetItem =
  | SelectionSetItemField
  | SelectionSetItemFragmentSpread
  | SelectionSetItemInlineFragment;

export interface Fragment {
  name: string;
  typeCondition: string;
  directives: Directive[];
  selectionSet: SelectionSetItem[];
}

export type VariableDefinitions = Partial<Record<string, VariableDefinition>>;

export interface VariableDefinition {
  name: string;
  type: Type;
  defaultValue: Value | undefined;
  directives: Directive[];
}

export interface OperationItem {
  type?: "query" | "mutation" | "subscription";
  name: string | undefined;
  variableDefinitions: VariableDefinitions;
  directives: Directive[];
  selectionSet: SelectionSetItem[];
}

export interface Operation {
  isError: false;
  fragments: Partial<Record<string, Fragment>>;
  operations: Partial<Record<string, OperationItem>>;
}

class ParseError extends Error {
  public readonly error: Error;

  constructor(error: Error) {
    super();
    this.error = error;
  }
}

function raise(error: Error): never {
  throw new ParseError(error);
}

function isError<T>(t: Error | T): t is Error {
  return t && typeof t === "object" && "isError" in t && t.isError === true;
}

function unwrap<T>(result: Error | T): T {
  if (isError(result)) {
    throw new ParseError(result);
  }
  return result;
}

function optional<T, U>(t: T, map: (t: NonNullable<T>) => U): U;
function optional<T, U>(t: T | null, map: (t: NonNullable<T>) => U): U | null;
function optional<T, U>(
  t: T | undefined,
  map: (t: NonNullable<T>) => U
): U | undefined;
function optional<T, U>(
  t: T | null | undefined,
  map: (t: NonNullable<T>) => U
): U | null | undefined;
function optional<T, U>(
  t: T | null | undefined,
  map: (t: NonNullable<T>) => U
): U | null | undefined {
  return t === null || t === undefined ? (t as null | undefined) : map(t);
}

export function analyzeSchema(document: Document): Schema | Error {
  try {
    return unwrap(schema(document));
  } catch (e) {
    if (e instanceof ParseError) {
      return e.error;
    }
    throw e;
  }
}

interface SchemaContext {
  description: string | undefined;
  rootOperationTypes: Partial<Record<OperationType, string>> | undefined;
  schemaDirectives: Directive[];
  directiveDefinitions: DirectiveDefinitions;
  typeDefinitions: TypeDefinitions;
}

function schema(document: Document): Schema {
  const context: SchemaContext = {
    description: undefined,
    rootOperationTypes: undefined,
    schemaDirectives: [],
    directiveDefinitions: {},
    typeDefinitions: {},
  };

  for (const definition of document) {
    switch (definition.type) {
      case "typeSystem":
        typeSystem(definition, context);
        break;
      case "executable":
        raise({ isError: true, message: "ExecutableDocument in Schema" });
    }
  }

  return {
    isError: false,
    description: context.description,
    rootOperationTypes: context.rootOperationTypes ?? {},
    schemaDirectives: context.schemaDirectives,
    directiveDefinitions: context.directiveDefinitions,
    typeDefinitions: context.typeDefinitions,
  };
}

function typeSystem(
  definition: TypeSystemDefinitionOrExtension,
  context: SchemaContext
): void {
  switch (definition.subType) {
    case "definition":
      typeSystemDefinition(definition, context);
      break;
    case "extension":
      typeSystemExtension(definition, context);
      break;
  }
}

function typeSystemDefinition(
  definition: TypeSystemDefinition,
  context: SchemaContext
): void {
  switch (definition.definitionType) {
    case "schema":
      schemaDefinition(definition, context);
      break;
    case "directive":
      directiveDefinition(definition, context);
      break;
    case "type":
      typeDefinition(definition, context);
      break;
  }
}

function schemaDefinition(
  definition: SchemaDefinition,
  context: SchemaContext
): void {
  if (context.rootOperationTypes) {
    raise({
      isError: true,
      message: "Multiple SchemaDefinition",
    });
  }
  context.rootOperationTypes = {};
  for (const rootOperationTypeDefinition of definition.rootOperationTypeDefinitions) {
    if (context.rootOperationTypes[rootOperationTypeDefinition.operationType]) {
      raise({
        isError: true,
        message: `Multiple RootOperationTypeDefinition for ${rootOperationTypeDefinition.operationType}`,
      });
    }
    context.rootOperationTypes[rootOperationTypeDefinition.operationType] =
      rootOperationTypeDefinition.type;
  }
  context.description = definition.description;
  context.schemaDirectives.push(
    ...directives(definition.directives, "schema definition")
  );
}

function directiveDefinition(
  definition: ParserDirectiveDefinition,
  context: SchemaContext
): void {
  if (context.directiveDefinitions[definition.name]) {
    raise({
      isError: true,
      message: `Multiple DirectiveDefinition for ${definition.name}`,
    });
  }
  const directive = (context.directiveDefinitions[definition.name] = {
    description: definition.description,
    locations: {},
    name: definition.name,
    repeatable: definition.repeatable,
    argumentsDefinition: inputValuesDefinition(
      definition.argumentsDefinition,
      `directive ${definition.name}`
    ),
  } as DirectiveDefinition);
  for (const directiveLocation of definition.directiveLocations) {
    if (directive.locations[directiveLocation]) {
      raise({
        isError: true,
        message: `Multiple DirectiveLocation ${directiveLocation} for directive ${directive.name}`,
      });
    }
    directive.locations[directiveLocation] = true;
  }
}

function typeDefinition(
  definition: ParserTypeDefinition,
  context: SchemaContext
): void {
  if (context.typeDefinitions[definition.name]) {
    raise({
      isError: true,
      message: `Multiple TypeDefinition for ${definition.name}`,
    });
  }
  switch (definition.typeType) {
    case "scalar":
      scalarTypeDefinition(definition, context);
      break;
    case "object":
      objectTypeDefinition(definition, context);
      break;
    case "interface":
      interfaceTypeDefinition(definition, context);
      break;
    case "union":
      unionTypeDefinition(definition, context);
      break;
    case "enum":
      enumTypeDefinition(definition, context);
      break;
    case "inputObject":
      inputObjectTypeDefinition(definition, context);
      break;
  }
}

function scalarTypeDefinition(
  definition: ParserScalarTypeDefinition,
  context: SchemaContext
): void {
  context.typeDefinitions[definition.name] = {
    name: definition.name,
    type: "scalar",
    description: definition.description,
    directives: directives(
      definition.directives,
      `type ${definition.name} definition`
    ),
  };
}

function objectTypeDefinition(
  definition: ParserObjectTypeDefinition,
  context: SchemaContext
): void {
  context.typeDefinitions[definition.name] = {
    name: definition.name,
    type: "object",
    description: definition.description,
    directives: directives(
      definition.directives,
      `type ${definition.name} definition`
    ),
    implementsInterfaces: noDuplicate(
      definition.implementsInterfaces ?? [],
      `implements on type ${definition.description}`
    ),
    fieldsDefinition:
      optional(definition.fieldsDefinition, (d) =>
        fieldsDefinition(d, `type ${definition.name} definition`)
      ) ?? {},
  };
}

function interfaceTypeDefinition(
  definition: ParserInterfaceTypeDefinition,
  context: SchemaContext
): void {
  context.typeDefinitions[definition.name] = {
    name: definition.name,
    type: "interface",
    description: definition.description,
    directives: directives(
      definition.directives,
      `type ${definition.name} definition`
    ),
    implementsInterfaces: noDuplicate(
      definition.implementsInterfaces ?? [],
      `implements on type ${definition.description}`
    ),
    fieldsDefinition:
      optional(definition.fieldsDefinition, (d) =>
        fieldsDefinition(d, `type ${definition.name} definition`)
      ) ?? {},
  };
}

function unionTypeDefinition(
  definition: ParserUnionTypeDefinition,
  context: SchemaContext
): void {
  context.typeDefinitions[definition.name] = {
    name: definition.name,
    type: "union",
    description: definition.description,
    directives: directives(
      definition.directives,
      `type ${definition.name} definition`
    ),
    unionMemberTypes: noDuplicate(
      definition.unionMemberTypes ?? [],
      `type ${definition.name} definition`
    ),
  };
}

function enumTypeDefinition(
  definition: ParserEnumTypeDefinition,
  context: SchemaContext
): void {
  const enumValuesDefinition: EnumValuesDefinition = {};

  for (const enumValueDefinition of definition.enumValuesDefinition ?? []) {
    if (enumValuesDefinition[enumValueDefinition.enumValue]) {
      raise({
        isError: true,
        message: `Duplicate enum value ${enumValueDefinition.enumValue} on ${definition.name} definition`,
      });
    }
    enumValuesDefinition[enumValueDefinition.enumValue] = {
      name: enumValueDefinition.enumValue,
      description: enumValueDefinition.description,
      directives: directives(
        enumValueDefinition.directives,
        `type ${definition.name} definition`
      ),
    };
  }

  context.typeDefinitions[definition.name] = {
    name: definition.name,
    type: "enum",
    description: definition.description,
    directives: directives(
      definition.directives,
      `type ${definition.name} definition`
    ),
    enumValuesDefinition,
  };
}

function inputObjectTypeDefinition(
  definition: ParserInputObjectTypeDefinition,
  context: SchemaContext
): void {
  context.typeDefinitions[definition.name] = {
    name: definition.name,
    type: "inputObject",
    description: definition.description,
    directives: directives(
      definition.directives,
      `type ${definition.name} definition`
    ),
    inputFieldsDefinition: inputValuesDefinition(
      definition.inputFieldsDefinition,
      `type ${definition.name} definition`
    ),
  };
}

function typeSystemExtension(
  definition: TypeSystemExtension,
  context: SchemaContext
): void {
  switch (definition.extensionType) {
    case "schema":
      schemaExtension(definition, context);
      break;
    case "type":
      typeExtension(definition, context);
      break;
  }
}

function schemaExtension(
  definition: SchemaExtension,
  context: SchemaContext
): void {
  context.rootOperationTypes ??= {};
  for (const rootOperationTypeDefinition of definition.rootOperationTypeDefinitions ??
    []) {
    if (context.rootOperationTypes[rootOperationTypeDefinition.operationType]) {
      raise({
        isError: true,
        message: `Multiple RootOperationTypeDefinition for ${rootOperationTypeDefinition.operationType}`,
      });
    }
    context.rootOperationTypes[rootOperationTypeDefinition.operationType] =
      rootOperationTypeDefinition.type;
  }
  context.schemaDirectives.push(
    ...directives(definition.directives, "schema definition")
  );
}

function typeExtension(
  definition: TypeExtension,
  context: SchemaContext
): void {
  const typeDefinition = context.typeDefinitions[definition.name];
  if (!typeDefinition) {
    raise({
      isError: true,
      message: `Type extension before type definition for type ${definition.name}`,
    });
  }
  switch (definition.typeType) {
    case "scalar":
      scalarTypeExtension(definition, typeDefinition);
      break;
    case "object":
      objectTypeExtension(definition, typeDefinition);
      break;
    case "interface":
      interfaceTypeExtension(definition, typeDefinition);
      break;
    case "union":
      unionTypeExtension(definition, typeDefinition);
      break;
    case "enum":
      enumTypeExtension(definition, typeDefinition);
      break;
    case "inputObject":
      inputObjectTypeExtension(definition, typeDefinition);
      break;
  }
}

function scalarTypeExtension(
  definition: ScalarTypeExtension,
  typeDefinition: TypeDefinition
): void {
  if (typeDefinition.type !== "scalar") {
    raise({
      isError: true,
      message: `Type extension for type with different type ${definition.name}`,
    });
  }
  typeDefinition.directives.push(
    ...directives(definition.directives, `type ${definition.name} extension`)
  );
}

function objectTypeExtension(
  definition: ObjectTypeExtension,
  typeDefinition: TypeDefinition
): void {
  if (typeDefinition.type !== "object") {
    raise({
      isError: true,
      message: `Type extension for type with different type ${definition.name}`,
    });
  }
  typeDefinition.implementsInterfaces = noDuplicate(
    [
      ...typeDefinition.implementsInterfaces,
      ...(definition.implementsInterfaces ?? []),
    ],
    `implements on type ${definition.name} extension`
  );
  for (const fd of definition.fieldsDefinition ?? []) {
    if (typeDefinition.fieldsDefinition[fd.name]) {
      raise({
        isError: true,
        message: `Multiple field definition on type ${definition.type} extension`,
      });
    }
    typeDefinition.fieldsDefinition[fd.name] = fieldDefinition(
      fd,
      `field ${fd.name} on type ${definition.type} extension`
    );
  }
  typeDefinition.directives.push(
    ...directives(definition.directives, `type ${definition.name} extension`)
  );
}

function interfaceTypeExtension(
  definition: InterfaceTypeExtension,
  typeDefinition: TypeDefinition
): void {
  if (typeDefinition.type !== "interface") {
    raise({
      isError: true,
      message: `Type extension for type with different type ${definition.name}`,
    });
  }
  typeDefinition.implementsInterfaces = noDuplicate(
    [
      ...typeDefinition.implementsInterfaces,
      ...(definition.implementsInterfaces ?? []),
    ],
    `implements on type ${definition.name} extension`
  );
  for (const fd of definition.fieldsDefinition ?? []) {
    if (typeDefinition.fieldsDefinition[fd.name]) {
      raise({
        isError: true,
        message: `Multiple field definition on type ${definition.type} extension`,
      });
    }
    typeDefinition.fieldsDefinition[fd.name] = fieldDefinition(
      fd,
      `field ${fd.name} on type ${definition.type} extension`
    );
  }
  typeDefinition.directives.push(
    ...directives(definition.directives, `type ${definition.name} extension`)
  );
}

function unionTypeExtension(
  definition: UnionTypeExtension,
  typeDefinition: TypeDefinition
): void {
  if (typeDefinition.type !== "union") {
    raise({
      isError: true,
      message: `Type extension for type with different type ${definition.name}`,
    });
  }
  typeDefinition.directives.push(
    ...directives(definition.directives, `type ${definition.name} extension`)
  );
  typeDefinition.unionMemberTypes = noDuplicate(
    [
      ...typeDefinition.unionMemberTypes,
      ...(definition.unionMemberTypes ?? []),
    ],
    `type ${definition.name} extension`
  );
}

function enumTypeExtension(
  definition: EnumTypeExtension,
  typeDefinition: TypeDefinition
): void {
  if (typeDefinition.type !== "enum") {
    raise({
      isError: true,
      message: `Type extension for type with different type ${definition.name}`,
    });
  }
  for (const enumValueDefinition of definition.enumValuesDefinition ?? []) {
    if (typeDefinition.enumValuesDefinition[enumValueDefinition.enumValue]) {
      raise({
        isError: true,
        message: `Duplicate enum value ${enumValueDefinition.enumValue} on ${definition.name} extension`,
      });
    }
    typeDefinition.enumValuesDefinition[enumValueDefinition.enumValue] = {
      name: enumValueDefinition.enumValue,
      description: enumValueDefinition.description,
      directives: directives(
        enumValueDefinition.directives,
        `type ${definition.name} extension`
      ),
    };
  }
  typeDefinition.directives.push(
    ...directives(definition.directives, `type ${definition.name} extension`)
  );
}

function inputObjectTypeExtension(
  definition: InputObjectTypeExtension,
  typeDefinition: TypeDefinition
): void {
  if (typeDefinition.type !== "inputObject") {
    raise({
      isError: true,
      message: `Type extension for type with different type ${definition.name}`,
    });
  }
  for (const argumentDefinition of definition.inputFieldsDefinition ?? []) {
    if (typeDefinition.inputFieldsDefinition[argumentDefinition.name]) {
      raise({
        isError: true,
        message: `Multiple argument ${argumentDefinition.name} on type ${definition.name} extension`,
      });
    }
    typeDefinition.inputFieldsDefinition[argumentDefinition.name] = {
      name: argumentDefinition.name,
      description: argumentDefinition.description,
      type: argumentDefinition.type,
      defaultValue: argumentDefinition.defaultValue,
      directives: directives(
        argumentDefinition.directives,
        `argument on type ${definition.name} extension`
      ),
    };
  }
  typeDefinition.directives.push(
    ...directives(definition.directives, `type ${definition.name} extension`)
  );
}

function directives(
  directives: ParserDirective[] | undefined,
  on: string
): Directive[] {
  return (directives ?? []).map((d) => directive(d, on));
}

function directive(directive: ParserDirective, on: string): Directive {
  const args: Arguments = {};

  for (const argument of directive.arguments ?? []) {
    if (args[argument.name]) {
      raise({
        isError: true,
        message: `Multiple argument ${argument.name} on directive ${directive.name} on ${on}`,
      });
    }
    args[argument.name] = { name: argument.name, value: argument.value };
  }

  return {
    name: directive.name,
    arguments: args,
  };
}

function inputValuesDefinition(
  definition: ParserArgumentsDefinition | undefined,
  on: string
): ArgumentsDefinition {
  const result: ArgumentsDefinition = {};

  for (const argumentDefinition of definition ?? []) {
    if (result[argumentDefinition.name]) {
      return raise({
        isError: true,
        message: `Multiple argument ${argumentDefinition.name} on ${on}`,
      });
    }
    result[argumentDefinition.name] = {
      name: argumentDefinition.name,
      description: argumentDefinition.description,
      type: argumentDefinition.type,
      defaultValue: argumentDefinition.defaultValue,
      directives: directives(
        argumentDefinition.directives,
        `argument on ${on}`
      ),
    };
  }

  return result;
}

function fieldsDefinition(
  definition: ParserFieldsDefinition,
  on: string
): FieldsDefinition {
  const result: FieldsDefinition = {};

  for (const fd of definition) {
    if (result[fd.name]) {
      return raise({
        isError: true,
        message: `Multiple field definition on ${on}`,
      });
    }
    result[fd.name] = fieldDefinition(fd, `field ${fd.name} on ${on}`);
  }

  return result;
}

function fieldDefinition(
  definition: ParserFieldDefinition,
  on: string
): FieldDefinition {
  return {
    description: definition.description,
    name: definition.name,
    argumentsDefinition: inputValuesDefinition(
      definition.argumentsDefinition,
      on
    ),
    directives: directives(definition.directives, on),
    type: definition.type,
  };
}

function noDuplicate(strs: string[], on: string): string[] {
  if (new Set(strs).size !== strs.length) {
    raise({ isError: true, message: `Duplicate ${on}` });
  }
  return strs;
}

export function analyzeOperation(document: Document): Operation | Error {
  try {
    return unwrap(operation(document));
  } catch (e) {
    if (e instanceof ParseError) {
      return e.error;
    }
    throw e;
  }
}

interface OperationContext {
  fragments: Partial<Record<string, Fragment>>;
  operations: Partial<Record<string, OperationItem>>;
}

function operation(document: Document): Operation {
  const context: OperationContext = {
    fragments: {},
    operations: {},
  };

  for (const definition of document) {
    switch (definition.type) {
      case "typeSystem":
        raise({
          isError: true,
          message: "TypeSystemDefinitionOrExtension in Operation",
        });
      case "executable":
        executable(definition, context);
        break;
    }
  }

  return {
    isError: false,
    ...context,
  };
}

function executable(
  definition: ExecutableDefinition,
  context: OperationContext
): void {
  // TODO:
  switch (definition.subType) {
    case "fragment":
      break;
    case "operation":
      break;
  }
}
