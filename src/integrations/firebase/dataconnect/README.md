# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `eshop-connector`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*getProductById*](#getproductbyid)
- [**Mutations**](#mutations)
  - [*createProduct*](#createproduct)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `eshop-connector`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@eshop/dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@eshop/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@eshop/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `eshop-connector` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## getProductById
You can execute the `getProductById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
getProductById(vars: GetProductByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductByIdData, GetProductByIdVariables>;

interface GetProductByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProductByIdVariables): QueryRef<GetProductByIdData, GetProductByIdVariables>;
}
export const getProductByIdRef: GetProductByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getProductById(dc: DataConnect, vars: GetProductByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductByIdData, GetProductByIdVariables>;

interface GetProductByIdRef {
  ...
  (dc: DataConnect, vars: GetProductByIdVariables): QueryRef<GetProductByIdData, GetProductByIdVariables>;
}
export const getProductByIdRef: GetProductByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getProductByIdRef:
```typescript
const name = getProductByIdRef.operationName;
console.log(name);
```

### Variables
The `getProductById` query requires an argument of type `GetProductByIdVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetProductByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `getProductById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetProductByIdData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetProductByIdData {
  products?: {
    id: UUIDString;
    name: string;
  } & Products_Key;
}
```
### Using `getProductById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getProductById, GetProductByIdVariables } from '@eshop/dataconnect';

// The `getProductById` query requires an argument of type `GetProductByIdVariables`:
const getProductByIdVars: GetProductByIdVariables = {
  id: ..., 
};

// Call the `getProductById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getProductById(getProductByIdVars);
// Variables can be defined inline as well.
const { data } = await getProductById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getProductById(dataConnect, getProductByIdVars);

console.log(data.products);

// Or, you can use the `Promise` API.
getProductById(getProductByIdVars).then((response) => {
  const data = response.data;
  console.log(data.products);
});
```

### Using `getProductById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getProductByIdRef, GetProductByIdVariables } from '@eshop/dataconnect';

// The `getProductById` query requires an argument of type `GetProductByIdVariables`:
const getProductByIdVars: GetProductByIdVariables = {
  id: ..., 
};

// Call the `getProductByIdRef()` function to get a reference to the query.
const ref = getProductByIdRef(getProductByIdVars);
// Variables can be defined inline as well.
const ref = getProductByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getProductByIdRef(dataConnect, getProductByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.products);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.products);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `eshop-connector` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## createProduct
You can execute the `createProduct` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect/index.d.ts](./index.d.ts):
```typescript
createProduct(vars: CreateProductVariables): MutationPromise<CreateProductData, CreateProductVariables>;

interface CreateProductRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateProductVariables): MutationRef<CreateProductData, CreateProductVariables>;
}
export const createProductRef: CreateProductRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createProduct(dc: DataConnect, vars: CreateProductVariables): MutationPromise<CreateProductData, CreateProductVariables>;

interface CreateProductRef {
  ...
  (dc: DataConnect, vars: CreateProductVariables): MutationRef<CreateProductData, CreateProductVariables>;
}
export const createProductRef: CreateProductRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createProductRef:
```typescript
const name = createProductRef.operationName;
console.log(name);
```

### Variables
The `createProduct` mutation requires an argument of type `CreateProductVariables`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateProductVariables {
  name: string;
  slug: string;
  regularPrice: number;
}
```
### Return Type
Recall that executing the `createProduct` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateProductData`, which is defined in [dataconnect/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateProductData {
  products_insert: Products_Key;
}
```
### Using `createProduct`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createProduct, CreateProductVariables } from '@eshop/dataconnect';

// The `createProduct` mutation requires an argument of type `CreateProductVariables`:
const createProductVars: CreateProductVariables = {
  name: ..., 
  slug: ..., 
  regularPrice: ..., 
};

// Call the `createProduct()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createProduct(createProductVars);
// Variables can be defined inline as well.
const { data } = await createProduct({ name: ..., slug: ..., regularPrice: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createProduct(dataConnect, createProductVars);

console.log(data.products_insert);

// Or, you can use the `Promise` API.
createProduct(createProductVars).then((response) => {
  const data = response.data;
  console.log(data.products_insert);
});
```

### Using `createProduct`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createProductRef, CreateProductVariables } from '@eshop/dataconnect';

// The `createProduct` mutation requires an argument of type `CreateProductVariables`:
const createProductVars: CreateProductVariables = {
  name: ..., 
  slug: ..., 
  regularPrice: ..., 
};

// Call the `createProductRef()` function to get a reference to the mutation.
const ref = createProductRef(createProductVars);
// Variables can be defined inline as well.
const ref = createProductRef({ name: ..., slug: ..., regularPrice: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createProductRef(dataConnect, createProductVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.products_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.products_insert);
});
```

