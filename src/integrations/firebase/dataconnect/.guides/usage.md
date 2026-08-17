# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createProduct, getProductById } from '@eshop/dataconnect';


// Operation createProduct:  For variables, look at type CreateProductVars in ../index.d.ts
const { data } = await CreateProduct(dataConnect, createProductVars);

// Operation getProductById:  For variables, look at type GetProductByIdVars in ../index.d.ts
const { data } = await GetProductById(dataConnect, getProductByIdVars);


```