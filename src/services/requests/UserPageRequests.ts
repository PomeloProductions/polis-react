import { AxiosResponse } from 'axios';
import api, { dedupedGet } from '../api';
import { UserPage, UserPageComponent } from '../../models/user/user-page';

export function getUserPages(
    userId: number
): Promise<AxiosResponse<{ data: UserPage[] }>> {
    return dedupedGet(`/users/${userId}/pages`, {
        params: { 'expand[components]': '*', limit: 100 },
    });
}

export function createUserPage(
    userId: number,
    data: Partial<UserPage>
): Promise<AxiosResponse<UserPage>> {
    return api.post(`/users/${userId}/pages`, data);
}

export function updateUserPage(
    userId: number,
    pageId: number,
    data: Partial<UserPage>
): Promise<AxiosResponse<UserPage>> {
    return api.put(`/users/${userId}/pages/${pageId}`, data);
}

export function deleteUserPage(
    userId: number,
    pageId: number
): Promise<AxiosResponse> {
    return api.delete(`/users/${userId}/pages/${pageId}`);
}

export function createUserPageComponent(
    userId: number,
    pageId: number,
    data: Partial<UserPageComponent>
): Promise<AxiosResponse<UserPageComponent>> {
    return api.post(`/users/${userId}/pages/${pageId}/components`, data);
}

export function updateUserPageComponent(
    userId: number,
    pageId: number,
    componentId: number,
    data: Partial<UserPageComponent>
): Promise<AxiosResponse<UserPageComponent>> {
    return api.put(`/users/${userId}/pages/${pageId}/components/${componentId}`, data);
}

export function deleteUserPageComponent(
    userId: number,
    pageId: number,
    componentId: number
): Promise<AxiosResponse> {
    return api.delete(`/users/${userId}/pages/${pageId}/components/${componentId}`);
}
