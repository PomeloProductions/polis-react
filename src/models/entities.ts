import User from './user/user';
import Organization from './organization/organization';
import BaseModel from './base-model';

export type AvailableEntityTypes
    = 'user' | 'organization'

export type Entity
    = User | Organization

export default interface BaseEntityModel extends BaseModel {
}
