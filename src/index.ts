import {
  DirectiveLocation,
  Document,
  OperationType,
  ArgumentsDefinition as ParserArgumentsDefinition,
  Directive as ParserDirective,
  FieldDefinition as ParserFieldDefinition,
  FieldsDefinition as ParserFieldsDefinition,
  Type,
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
  description?: string;
  directives: Directive[];
}

export interface ScalarTypeDefinition extends TypeDefinitionBase {
  type: "scalar";
}

export interface FieldDefinition {
  description?: string;
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
  rootOperationTypes: Record<OperationType, string | undefined>;
  schemaDirectives: Directive[];
  directiveDefinitions: DirectiveDefinitions;
  typeDefinitions: TypeDefinitions;
}

export interface Operation {
  // TODO:
}

class ParseError extends Error {
  public readonly error: Error;

  constructor(error: Error) {
    super();
    this.error = error;
  }
}

function isError<T>(t: Error | T): t is Error {
  return t && typeof t === "object" && "isError" in t && t.isError === true;
}

function unwrap(error: Error): never;
function unwrap<T>(result: Error | T): T;
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

function schema(document: Document): Schema | Error {
  let description: string | undefined;
  let rootOperationTypes: Record<OperationType, string | undefined> | undefined;
  const schemaDirectives: Directive[] = [];
  const directiveDefinitions: DirectiveDefinitions = {};
  const typeDefinitions: TypeDefinitions = {};

  for (const definition of document) {
    switch (definition.type) {
      case "typeSystem": {
        switch (definition.subType) {
          case "definition": {
            switch (definition.definitionType) {
              case "schema": {
                if (rootOperationTypes) {
                  return {
                    isError: true,
                    message: "Multiple SchemaDefinition",
                  };
                }
                rootOperationTypes = {
                  query: undefined,
                  mutation: undefined,
                  subscription: undefined,
                };
                for (const rootOperationTypeDefinition of definition.rootOperationTypeDefinitions) {
                  if (
                    rootOperationTypes[
                      rootOperationTypeDefinition.operationType
                    ]
                  ) {
                    return {
                      isError: true,
                      message: `Multiple RootOperationTypeDefinition for ${rootOperationTypeDefinition.operationType}`,
                    };
                  }
                  rootOperationTypes[
                    rootOperationTypeDefinition.operationType
                  ] = rootOperationTypeDefinition.type;
                }
                description = definition.description;
                schemaDirectives.push(
                  ...directives(definition.directives, "schema definition")
                );
                break;
              }
              case "directive": {
                if (directiveDefinitions[definition.name]) {
                  return {
                    isError: true,
                    message: `Multiple DirectiveDefinition for ${definition.name}`,
                  };
                }
                const directive = (directiveDefinitions[definition.name] = {
                  description: definition.description,
                  locations: {},
                  name: definition.name,
                  repeatable: definition.repeatable,
                  argumentsDefinition: unwrap(
                    inputValuesDefinition(
                      definition.argumentsDefinition,
                      `directive ${definition.name}`
                    )
                  ),
                } as DirectiveDefinition);
                for (const directiveLocation of definition.directiveLocations) {
                  if (directive.locations[directiveLocation]) {
                    return {
                      isError: true,
                      message: `Multiple DirectiveLocation ${directiveLocation} for directive ${directive.name}`,
                    };
                  }
                  directive.locations[directiveLocation] = true;
                }
                break;
              }
              case "type": {
                if (typeDefinitions[definition.name]) {
                  return {
                    isError: true,
                    message: `Multiple TypeDefinition for ${definition.name}`,
                  };
                }
                switch (definition.typeType) {
                  case "scalar": {
                    typeDefinitions[definition.name] = {
                      name: definition.name,
                      type: "scalar",
                      description: definition.description,
                      directives: directives(
                        definition.directives,
                        `type ${definition.name} definition`
                      ),
                    };
                    break;
                  }
                  case "object": {
                    typeDefinitions[definition.name] = {
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
                          unwrap(
                            fieldsDefinition(
                              d,
                              `type ${definition.name} definition`
                            )
                          )
                        ) ?? {},
                    };
                    break;
                  }
                  case "interface": {
                    typeDefinitions[definition.name] = {
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
                          unwrap(
                            fieldsDefinition(
                              d,
                              `type ${definition.name} definition`
                            )
                          )
                        ) ?? {},
                    };
                    break;
                  }
                  case "union": {
                    typeDefinitions[definition.name] = {
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
                    break;
                  }
                  case "enum": {
                    const enumValuesDefinition: EnumValuesDefinition = {};

                    for (const enumValueDefinition of definition.enumValuesDefinition ??
                      []) {
                      if (enumValuesDefinition[enumValueDefinition.enumValue]) {
                        return {
                          isError: true,
                          message: `Duplicate enum value ${enumValueDefinition.enumValue} on ${definition.name} definition`,
                        };
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

                    typeDefinitions[definition.name] = {
                      name: definition.name,
                      type: "enum",
                      description: definition.description,
                      directives: directives(
                        definition.directives,
                        `type ${definition.name} definition`
                      ),
                      enumValuesDefinition,
                    };
                    break;
                  }
                  case "inputObject": {
                    typeDefinitions[definition.name] = {
                      name: definition.name,
                      type: "inputObject",
                      description: definition.description,
                      directives: directives(
                        definition.directives,
                        `type ${definition.name} definition`
                      ),
                      inputFieldsDefinition: unwrap(
                        inputValuesDefinition(
                          definition.inputFieldsDefinition,
                          `type ${definition.name} definition`
                        )
                      ),
                    };
                    break;
                  }
                }
              }
            }
            break;
          }
          case "extension": {
            switch (definition.extensionType) {
              case "schema": {
                if (!rootOperationTypes) {
                  return {
                    isError: true,
                    message: "SchemaExtension before SchemaDefinition",
                  };
                }
                for (const rootOperationTypeDefinition of definition.rootOperationTypeDefinitions ??
                  []) {
                  if (
                    rootOperationTypes[
                      rootOperationTypeDefinition.operationType
                    ]
                  ) {
                    return {
                      isError: true,
                      message: `Multiple RootOperationTypeDefinition for ${rootOperationTypeDefinition.operationType}`,
                    };
                  }
                  rootOperationTypes[
                    rootOperationTypeDefinition.operationType
                  ] = rootOperationTypeDefinition.type;
                }
                schemaDirectives.push(
                  ...directives(definition.directives, "schema definition")
                );
                break;
              }
              case "type": {
                const typeDefinition = typeDefinitions[definition.name];
                if (!typeDefinition) {
                  return {
                    isError: true,
                    message: `Type extension before type definition for type ${definition.name}`,
                  };
                }
                switch (definition.typeType) {
                  case "scalar": {
                    if (typeDefinition.type !== "scalar") {
                      return {
                        isError: true,
                        message: `Type extension for type with different type ${definition.name}`,
                      };
                    }
                    typeDefinition.directives.push(
                      ...directives(
                        definition.directives,
                        `type ${definition.name} extension`
                      )
                    );
                    break;
                  }
                  case "object": {
                    if (typeDefinition.type !== "object") {
                      return {
                        isError: true,
                        message: `Type extension for type with different type ${definition.name}`,
                      };
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
                        return {
                          isError: true,
                          message: `Multiple field definition on type ${definition.type} extension`,
                        };
                      }
                      typeDefinition.fieldsDefinition[fd.name] =
                        fieldDefinition(
                          fd,
                          `field ${fd.name} on type ${definition.type} extension`
                        );
                    }
                    typeDefinition.directives.push(
                      ...directives(
                        definition.directives,
                        `type ${definition.name} extension`
                      )
                    );
                    break;
                  }
                  case "interface": {
                    if (typeDefinition.type !== "interface") {
                      return {
                        isError: true,
                        message: `Type extension for type with different type ${definition.name}`,
                      };
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
                        return {
                          isError: true,
                          message: `Multiple field definition on type ${definition.type} extension`,
                        };
                      }
                      typeDefinition.fieldsDefinition[fd.name] =
                        fieldDefinition(
                          fd,
                          `field ${fd.name} on type ${definition.type} extension`
                        );
                    }
                    typeDefinition.directives.push(
                      ...directives(
                        definition.directives,
                        `type ${definition.name} extension`
                      )
                    );
                    break;
                  }
                  case "union": {
                    if (typeDefinition.type !== "union") {
                      return {
                        isError: true,
                        message: `Type extension for type with different type ${definition.name}`,
                      };
                    }
                    typeDefinition.directives.push(
                      ...directives(
                        definition.directives,
                        `type ${definition.name} extension`
                      )
                    );
                    typeDefinition.unionMemberTypes = noDuplicate(
                      [
                        ...typeDefinition.unionMemberTypes,
                        ...(definition.unionMemberTypes ?? []),
                      ],
                      `type ${definition.name} extension`
                    );
                    break;
                  }
                  case "enum": {
                    if (typeDefinition.type !== "enum") {
                      return {
                        isError: true,
                        message: `Type extension for type with different type ${definition.name}`,
                      };
                    }
                    for (const enumValueDefinition of definition.enumValuesDefinition ??
                      []) {
                      if (
                        typeDefinition.enumValuesDefinition[
                          enumValueDefinition.enumValue
                        ]
                      ) {
                        return {
                          isError: true,
                          message: `Duplicate enum value ${enumValueDefinition.enumValue} on ${definition.name} extension`,
                        };
                      }
                      typeDefinition.enumValuesDefinition[
                        enumValueDefinition.enumValue
                      ] = {
                        name: enumValueDefinition.enumValue,
                        description: enumValueDefinition.description,
                        directives: directives(
                          enumValueDefinition.directives,
                          `type ${definition.name} extension`
                        ),
                      };
                    }
                    typeDefinition.directives.push(
                      ...directives(
                        definition.directives,
                        `type ${definition.name} extension`
                      )
                    );
                    break;
                  }
                  case "inputObject": {
                    if (typeDefinition.type !== "inputObject") {
                      return {
                        isError: true,
                        message: `Type extension for type with different type ${definition.name}`,
                      };
                    }
                    for (const argumentDefinition of definition.inputFieldsDefinition ??
                      []) {
                      if (
                        typeDefinition.inputFieldsDefinition[
                          argumentDefinition.name
                        ]
                      ) {
                        return {
                          isError: true,
                          message: `Multiple argument ${argumentDefinition.name} on type ${definition.name} extension`,
                        };
                      }
                      typeDefinition.inputFieldsDefinition[
                        argumentDefinition.name
                      ] = {
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
                      ...directives(
                        definition.directives,
                        `type ${definition.name} extension`
                      )
                    );
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    isError: false,
    description,
    rootOperationTypes: unwrap(
      rootOperationTypes ?? { isError: true, message: "No SchemaDefinition" }
    ),
    schemaDirectives,
    directiveDefinitions,
    typeDefinitions,
  };
}

function directives(
  directives: ParserDirective[] | undefined,
  on: string
): Directive[] {
  return (directives ?? []).map((d) => unwrap(directive(d, on)));
}

function directive(directive: ParserDirective, on: string): Directive | Error {
  const args: Arguments = {};

  for (const argument of directive.arguments ?? []) {
    if (args[argument.name]) {
      return {
        isError: true,
        message: `Multiple argument ${argument.name} on directive ${directive.name} on ${on}`,
      };
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
): ArgumentsDefinition | Error {
  const result: ArgumentsDefinition = {};

  for (const argumentDefinition of definition ?? []) {
    if (result[argumentDefinition.name]) {
      return {
        isError: true,
        message: `Multiple argument ${argumentDefinition.name} on ${on}`,
      };
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
): FieldsDefinition | Error {
  const result: FieldsDefinition = {};

  for (const fd of definition) {
    if (result[fd.name]) {
      return {
        isError: true,
        message: `Multiple field definition on ${on}`,
      };
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
    argumentsDefinition: unwrap(
      inputValuesDefinition(definition.argumentsDefinition, on)
    ),
    directives: directives(definition.directives, on),
    type: definition.type,
  };
}

function noDuplicate(strs: string[], on: string): string[] {
  if (new Set(strs).size !== strs.length) {
    unwrap({ isError: true, message: `Duplicate ${on}` });
  }
  return strs;
}

export function OperationSchema(document: Document): Operation | Error {
  try {
    return unwrap(operation(document));
  } catch (e) {
    if (e instanceof ParseError) {
      return e.error;
    }
    throw e;
  }
}

function operation(document: Document): Operation | Error {
  //
}
