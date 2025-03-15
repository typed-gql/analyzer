import {
  DirectiveLocation,
  Document,
  OperationType,
  ArgumentsDefinition as ParserArgumentsDefinition,
  Directive as ParserDirective,
  Type,
  Value,
} from "@typed-gql/parser";

export interface Error {
  isError: true;
  message: string;
}

export type DirectiveLocationMap = Partial<Record<DirectiveLocation, true>>;

export type ArgumentsDefinition = Partial<Record<string, ArgumentDefinition>>;

export interface Argument {
  name: string;
  value: Value;
}

export type Arguments = Partial<Record<string, Argument>>;

export interface Directive {
  name: string;
  arguments: Arguments;
}

export interface ArgumentDefinition {
  description: string | undefined;
  name: string;
  type: Type;
  defaultValue: Value | undefined;
  directives: Directive[];
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

export interface Query {
  //
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
                  ...(definition.directives ?? []).map((d) =>
                    unwrap(directive(d))
                  )
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
                  argumentsDefinition: optional(
                    definition.argumentsDefinition,
                    (t) => unwrap(argumentsDefinition(t))
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
                      directives: (definition.directives ?? []).map((d) =>
                        unwrap(directive(d))
                      ),
                    };
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

function directive(directive: ParserDirective): Directive | Error {
  const args: Arguments = {};

  for (const argument of directive.arguments ?? []) {
    if (args[argument.name]) {
      return {
        isError: true,
        message: `Multiple argument ${argument.name} on directive ${directive.name}`,
      };
    }
    args[argument.name] = { name: argument.name, value: argument.value };
  }

  return {
    name: directive.name,
    arguments: args,
  };
}

function argumentsDefinition(
  definition: ParserArgumentsDefinition
): ArgumentsDefinition | Error {
  const result: ArgumentsDefinition = {};

  for (const argumentDefinition of definition) {
    if (result[argumentDefinition.name]) {
      return {
        isError: true,
        message: ``,
      };
    }
  }

  return result;
}

export function analyzeOperation(document: Document): Query {
  //
}
