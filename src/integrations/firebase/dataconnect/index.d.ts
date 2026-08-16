import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Addresses_Key {
  id: UUIDString;
  __typename?: 'Addresses_Key';
}

export interface AdminActivityLogs_Key {
  id: UUIDString;
  __typename?: 'AdminActivityLogs_Key';
}

export interface AdminCredentials_Key {
  id: UUIDString;
  __typename?: 'AdminCredentials_Key';
}

export interface AdminRoles_Key {
  id: UUIDString;
  __typename?: 'AdminRoles_Key';
}

export interface AdminSessions_Key {
  id: UUIDString;
  __typename?: 'AdminSessions_Key';
}

export interface BlogPosts_Key {
  id: UUIDString;
  __typename?: 'BlogPosts_Key';
}

export interface Brands_Key {
  id: UUIDString;
  __typename?: 'Brands_Key';
}

export interface Campaigns_Key {
  id: UUIDString;
  __typename?: 'Campaigns_Key';
}

export interface CartItems_Key {
  id: UUIDString;
  __typename?: 'CartItems_Key';
}

export interface Categories_Key {
  id: UUIDString;
  __typename?: 'Categories_Key';
}

export interface CategoryCommissions_Key {
  id: UUIDString;
  __typename?: 'CategoryCommissions_Key';
}

export interface CjApiTokens_Key {
  id: UUIDString;
  __typename?: 'CjApiTokens_Key';
}

export interface CjCategoryMappings_Key {
  id: UUIDString;
  __typename?: 'CjCategoryMappings_Key';
}

export interface CjSettings_Key {
  id: UUIDString;
  __typename?: 'CjSettings_Key';
}

export interface CmsBanners_Key {
  id: UUIDString;
  __typename?: 'CmsBanners_Key';
}

export interface CmsPages_Key {
  id: UUIDString;
  __typename?: 'CmsPages_Key';
}

export interface Consignments_Key {
  id: UUIDString;
  __typename?: 'Consignments_Key';
}

export interface Conversations_Key {
  id: UUIDString;
  __typename?: 'Conversations_Key';
}

export interface Coupons_Key {
  id: UUIDString;
  __typename?: 'Coupons_Key';
}

export interface CreateProductData {
  products_insert: Products_Key;
}

export interface CreateProductVariables {
  name: string;
  slug: string;
  regularPrice: number;
}

export interface CustomSections_Key {
  id: UUIDString;
  __typename?: 'CustomSections_Key';
}

export interface FreeDeliveryRules_Key {
  id: UUIDString;
  __typename?: 'FreeDeliveryRules_Key';
}

export interface GetProductByIdData {
  products?: {
    id: UUIDString;
    name: string;
  } & Products_Key;
}

export interface GetProductByIdVariables {
  id: UUIDString;
}

export interface InventoryAlerts_Key {
  id: UUIDString;
  __typename?: 'InventoryAlerts_Key';
}

export interface InventoryLogs_Key {
  id: UUIDString;
  __typename?: 'InventoryLogs_Key';
}

export interface LayoutConfig_Key {
  id: UUIDString;
  __typename?: 'LayoutConfig_Key';
}

export interface LoyaltyPoints_Key {
  id: UUIDString;
  __typename?: 'LoyaltyPoints_Key';
}

export interface LoyaltyRewards_Key {
  id: UUIDString;
  __typename?: 'LoyaltyRewards_Key';
}

export interface Messages_Key {
  id: UUIDString;
  __typename?: 'Messages_Key';
}

export interface Notifications_Key {
  id: UUIDString;
  __typename?: 'Notifications_Key';
}

export interface OrderItems_Key {
  id: UUIDString;
  __typename?: 'OrderItems_Key';
}

export interface Orders_Key {
  id: UUIDString;
  __typename?: 'Orders_Key';
}

export interface Payments_Key {
  id: UUIDString;
  __typename?: 'Payments_Key';
}

export interface ProductImages_Key {
  id: UUIDString;
  __typename?: 'ProductImages_Key';
}

export interface ProductVariants_Key {
  id: UUIDString;
  __typename?: 'ProductVariants_Key';
}

export interface Products_Key {
  id: UUIDString;
  __typename?: 'Products_Key';
}

export interface Profiles_Key {
  id: UUIDString;
  __typename?: 'Profiles_Key';
}

export interface PushNotifications_Key {
  id: UUIDString;
  __typename?: 'PushNotifications_Key';
}

export interface PushTokens_Key {
  id: UUIDString;
  __typename?: 'PushTokens_Key';
}

export interface RecentlyViewed_Key {
  id: UUIDString;
  __typename?: 'RecentlyViewed_Key';
}

export interface Reviews_Key {
  id: UUIDString;
  __typename?: 'Reviews_Key';
}

export interface SearchHistory_Key {
  id: UUIDString;
  __typename?: 'SearchHistory_Key';
}

export interface SellerEarnings_Key {
  id: UUIDString;
  __typename?: 'SellerEarnings_Key';
}

export interface SellerPayouts_Key {
  id: UUIDString;
  __typename?: 'SellerPayouts_Key';
}

export interface SellerSupportMessages_Key {
  id: UUIDString;
  __typename?: 'SellerSupportMessages_Key';
}

export interface SellerSupportTickets_Key {
  id: UUIDString;
  __typename?: 'SellerSupportTickets_Key';
}

export interface Sellers_Key {
  id: UUIDString;
  __typename?: 'Sellers_Key';
}

export interface ShippingRates_Key {
  id: UUIDString;
  __typename?: 'ShippingRates_Key';
}

export interface ShippingZones_Key {
  id: UUIDString;
  __typename?: 'ShippingZones_Key';
}

export interface SiteConfig_Key {
  id: UUIDString;
  __typename?: 'SiteConfig_Key';
}

export interface SiteSettings_Key {
  id: UUIDString;
  __typename?: 'SiteSettings_Key';
}

export interface StaffAuditLogs_Key {
  id: UUIDString;
  __typename?: 'StaffAuditLogs_Key';
}

export interface StaffDepartments_Key {
  id: UUIDString;
  __typename?: 'StaffDepartments_Key';
}

export interface StaffInvitations_Key {
  id: UUIDString;
  __typename?: 'StaffInvitations_Key';
}

export interface StaffMembers_Key {
  id: UUIDString;
  __typename?: 'StaffMembers_Key';
}

export interface StaffMessages_Key {
  id: UUIDString;
  __typename?: 'StaffMessages_Key';
}

export interface StaffPermissions_Key {
  id: UUIDString;
  __typename?: 'StaffPermissions_Key';
}

export interface StaffRoles_Key {
  id: UUIDString;
  __typename?: 'StaffRoles_Key';
}

export interface StaffTasks_Key {
  id: UUIDString;
  __typename?: 'StaffTasks_Key';
}

export interface StudioThemeVersions_Key {
  id: UUIDString;
  __typename?: 'StudioThemeVersions_Key';
}

export interface ThemeConfig_Key {
  id: UUIDString;
  __typename?: 'ThemeConfig_Key';
}

export interface ThemeVersions_Key {
  id: UUIDString;
  __typename?: 'ThemeVersions_Key';
}

export interface UserRoles_Key {
  id: UUIDString;
  __typename?: 'UserRoles_Key';
}

export interface UserVouchers_Key {
  id: UUIDString;
  __typename?: 'UserVouchers_Key';
}

export interface WalletTransactions_Key {
  id: UUIDString;
  __typename?: 'WalletTransactions_Key';
}

export interface Warehouses_Key {
  id: UUIDString;
  __typename?: 'Warehouses_Key';
}

export interface Wishlist_Key {
  id: UUIDString;
  __typename?: 'Wishlist_Key';
}

interface CreateProductRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateProductVariables): MutationRef<CreateProductData, CreateProductVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateProductVariables): MutationRef<CreateProductData, CreateProductVariables>;
  operationName: string;
}
export const createProductRef: CreateProductRef;

export function createProduct(vars: CreateProductVariables): MutationPromise<CreateProductData, CreateProductVariables>;
export function createProduct(dc: DataConnect, vars: CreateProductVariables): MutationPromise<CreateProductData, CreateProductVariables>;

interface GetProductByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProductByIdVariables): QueryRef<GetProductByIdData, GetProductByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetProductByIdVariables): QueryRef<GetProductByIdData, GetProductByIdVariables>;
  operationName: string;
}
export const getProductByIdRef: GetProductByIdRef;

export function getProductById(vars: GetProductByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductByIdData, GetProductByIdVariables>;
export function getProductById(dc: DataConnect, vars: GetProductByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductByIdData, GetProductByIdVariables>;

