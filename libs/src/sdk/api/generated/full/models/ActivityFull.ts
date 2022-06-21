// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
/**
 * API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface ActivityFull
 */
export interface ActivityFull {
    /**
     * 
     * @type {string}
     * @memberof ActivityFull
     */
    timestamp?: string;
    /**
     * 
     * @type {object}
     * @memberof ActivityFull
     */
    item_type?: object;
    /**
     * 
     * @type {object}
     * @memberof ActivityFull
     */
    item?: object;
}

export function ActivityFullFromJSON(json: any): ActivityFull {
    return ActivityFullFromJSONTyped(json, false);
}

export function ActivityFullFromJSONTyped(json: any, ignoreDiscriminator: boolean): ActivityFull {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'timestamp': !exists(json, 'timestamp') ? undefined : json['timestamp'],
        'item_type': !exists(json, 'item_type') ? undefined : json['item_type'],
        'item': !exists(json, 'item') ? undefined : json['item'],
    };
}

export function ActivityFullToJSON(value?: ActivityFull | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'timestamp': value.timestamp,
        'item_type': value.item_type,
        'item': value.item,
    };
}
