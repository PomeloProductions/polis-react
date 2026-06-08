import Page, {createDummyPage, mergePageData} from '../models/page';
import React, {Dispatch, SetStateAction, act } from 'react';
import api from '../services/api';
import { type AxiosResponse, type AxiosError } from 'axios';
import BaseModel from '../models/base-model';

// Global cache for pending requests organized by route and page number
const pendingRequests: { [route: string]: { [page: number]: AbortController } } = {};

function cancelAllPendingRequests(route: string) {
    if (pendingRequests[route]) {
        Object.keys(pendingRequests[route]).forEach(page => {
            cancelRequest(route, parseInt(page));
        });
    }
}

function cancelRequest(route: string, page: number) {
    if (pendingRequests[route]?.[page]) {
        pendingRequests[route][page].abort();
        delete pendingRequests[route][page];
    }
}

export interface OrderProps {
    [key: string]: 'desc' | 'asc'
}

export interface FilterProps {
    [key: string]: number | string
}
export interface SearchProps {
    [key: string]: number | string | string[]
}

export interface BasePaginatedContextState<Model> {
    // The very last page of data loaded. This is probably the best piece of data to use
    // if your are doing something like infinite loading, but be aware of potential duplicates
    lastLoadedPage?: Page<Model>
    // All pieces of data that exist on the server. This is updated whenever a page is loaded, and is also
    // locally updated when a piece of data is added or removed
    total?: number
    // This will tell us whether or not there is another page to load after the loast loaded page
    hasAnotherPage: boolean
    // This variable will inform the developer of whether or not the initial load when the
    // context provider has been booted. This will be true after the initial boot even while refreshing
    initialLoadComplete: boolean
    // Whether or not everything has been set up for the first time
    initiated: boolean
    // This will tell our consumers whether or not there were no results
    noResults: boolean
    // If we are currently refreshing data
    refreshing: boolean
    // All expands that we want to load whenever a request is ran
    expands: string[]
    // Any orders to be appended to the query
    order: OrderProps
    // Any filters that have been added to the query
    filter: FilterProps
    // Any filters that have been added to the query
    search: SearchProps
    // How many items should be in each page of the request
    // If this is set over 100, it will result in a 400 error from the server
    limit: number,
    // All data that has been loaded off the server without duplicates
    loadedData: Model[]
    // whether we want to load all pages of data right away
    loadAll: boolean
    // This callback can be used to load the next page of data, and allows you to manage the pagination yourself.
    // This is ideal to pass to an infinite pagination callback, and it will return a list of the next page of
    // whatever relevant models.
    loadNext: (page?: number) => Promise<Page<Model>>
    // This callback will refresh all data from scratch, and is essentially a soft reset of the context provider.
    // This is ideal to pass to something like a pull to refresh component.
    refreshData: (persistData?: boolean) => Promise<Page<Model>>
    // This will set a specific filter value and then cause a data refresh
    setFilter: (key: string, value: number|string|null|undefined) => Promise<Page<Model>>
    // This will set a specific filter value and then cause a data refresh
    setSearch: (key: string, value: string|null|undefined) => Promise<Page<Model>>
    // This will set or update the order for a specific field
    setOrder: (key: string, direction: 'ASC'|'DESC'|null|undefined) => Promise<Page<Model>>
    // Callback to allow you to manually add a model to the loaded data
    addModel: (model: Model) => void
    // Callback to allow you to manually remove a model from the array of loaded models
    removeModel: (model: Model) => void
    // Convenience callback that lets us load a single model
    getModel: (id: number) => Model|null
    // validates that a result is correct
    validateResult?: (baseContext: BasePaginatedContextState<Model>, page: Page<Model>) => boolean
    // The raw params that we use
    params: Record<string, unknown>
}

export function defaultBaseContext<Model extends BaseModel>(): BasePaginatedContextState<Model> {
    return {
        hasAnotherPage: false,
        initialLoadComplete: false,
        initiated: false,
        noResults: false,
        refreshing: false,
        expands: [],
        order: {},
        filter: {},
        search: {},
        limit: 20,
        loadedData: [] as Model[],
        loadAll: false,
        params: {},
        loadNext: () => Promise.resolve(createDummyPage<Model>()),
        refreshData: () => Promise.resolve(createDummyPage<Model>()),
        setFilter: () => Promise.resolve(createDummyPage<Model>()),
        setSearch: () => Promise.resolve(createDummyPage<Model>()),
        setOrder: () => Promise.resolve(createDummyPage<Model>()),
         
        addModel: (_model: Model) => {},
         
        removeModel: (_model: Model) => {},
         
        getModel: (_id: number): Model | null => null,
    }
}

/**
 * Runs a request, and returns the data as a Page of data
 * @param endpoint
 * @param page
 * @param expands
 * @param order
 * @param filter
 * @param limit
 * @param search
 * @param params
 */
function runRequest<Model extends BaseModel>(endpoint: string, page: number, expands: string[], limit: number, order: OrderProps, filter: FilterProps, search: SearchProps, params: Record<string, unknown> = {}): Promise<Page<Model>> {
    if (!pendingRequests[endpoint]) {
        pendingRequests[endpoint] = {};
    }

    // Cancel any existing request for this route and page
    cancelRequest(endpoint, page);

    const controller = new AbortController();
    pendingRequests[endpoint][page] = controller;

    params.page = page;
    params.limit = limit;
    if (expands.length > 0) {
        expands.forEach(expand => {
            params["expand[" + expand + "]"] = '*';
        });
    }
    for (const orderKey in order) {
        params["order[" + orderKey + "]"] = order[orderKey];
    }
    for (const filterKey in filter) {
        if (filter[filterKey] !== undefined) {
            params["filter[" + filterKey + "]"] = filter[filterKey];
        }
    }
    for (const searchKey in search) {
        if (search[searchKey]) {
            const value = search[searchKey];
            if (Array.isArray(value)) {
                (value as string[]).forEach(entry => {
                    let searchParamArray = params["search[" + searchKey + "]"] as string[] | undefined;
                    if (!Array.isArray(searchParamArray)) {
                        searchParamArray = [];
                        params["search[" + searchKey + "]"] = searchParamArray;
                    }
                    searchParamArray.push(entry);
                })
            } else if (value === 'null') {
                params["search[" + searchKey + "]"] = value;
            } else {
                params["search[" + searchKey + "]"] = "like,*" + value + "*";
            }
        }
    }

    return api.get(endpoint, { 
        params,
        signal: controller.signal
    }).then((response: AxiosResponse) => {
        return Promise.resolve(response.data as Page<Model>);
    }).catch((error: AxiosError) => {
        if (error.name === 'CanceledError') {
            delete pendingRequests[endpoint]?.[page];
            return Promise.resolve(createDummyPage<Model>());
        }
        throw error;
    });
}

/**
 * Loads a single page of results, and handles the initial storing of the data
 * @param setContext
 * @param baseContext
 * @param endpoint
 * @param pageNumber
 * @param replace
 */
function loadPage<Model extends BaseModel>(setContext: Dispatch<SetStateAction<BasePaginatedContextState<Model>>>,
                  baseContext: BasePaginatedContextState<Model>,
                  endpoint: string, pageNumber: number, replace: boolean = false)
                  : Promise<Page<Model>> {
    return runRequest<Model>(endpoint, pageNumber, baseContext.expands, baseContext.limit, baseContext.order, baseContext.filter, baseContext.search, {...baseContext.params}).then((page: Page<Model>) => {
        const validResult = baseContext.validateResult ? baseContext.validateResult(baseContext, page) : true;

        if (!validResult) {
            // Ensure we return a Page<Model> consistent with the function's return type
            return Promise.resolve(createDummyPage<Model>());
        }

        baseContext.loadedData = [...replace ? page.data : mergePageData(page, baseContext.loadedData)];
        baseContext.total = page.total;
        baseContext.lastLoadedPage = page;
        baseContext.initialLoadComplete = true;
        baseContext.refreshing = false;
        baseContext.noResults = page.total === 0;
        baseContext.hasAnotherPage = page.current_page < page.last_page;
        const newContext= {...baseContext};
        if (process.env.NODE_ENV === 'test') {
            act(() => {
                setContext(newContext);
            });
        } else {
            setContext(newContext);
        }
        if (baseContext.loadAll) {
            newContext.loadNext();
        }
        return Promise.resolve(page);
    });
}

/**
 * Loads the next page of results depending upon the last loaded page
 * @param setContext
 * @param baseContext
 * @param endpoint
 */
function createLoadNextPageCallback<Model extends BaseModel>(setContext: Dispatch<SetStateAction<BasePaginatedContextState<Model>>>,
                                    baseContext: BasePaginatedContextState<Model>, endpoint: string)
                                    : () => Promise<Page<Model>> {
    return (page?: number): Promise<Page<Model>> => {
        const lastPage = baseContext.lastLoadedPage;
        if (lastPage) {
            if (lastPage.last_page > lastPage.current_page) {
                page = page ?? lastPage.current_page + 1;
                return loadPage<Model>(setContext, baseContext, endpoint, page);
            }
            return Promise.resolve(createDummyPage<Model>());
        } else {
            return loadPage<Model>(setContext, baseContext, endpoint, 1);
        }
    }
}

/**
 * Completely manages the refreshing of a paginated piece of data for us
 * @param setContext
 * @param baseContext
 * @param endpoint
 */
function createRefreshDataCallback<Model extends BaseModel>(setContext: Dispatch<SetStateAction<BasePaginatedContextState<Model>>>,
                                   baseContext: BasePaginatedContextState<Model>, endpoint: string)
                                   : (persistData?: boolean) => Promise<Page<Model>> {
    return (persistData?: boolean): Promise<Page<Model>> => {
        const newContext: BasePaginatedContextState<Model> = {
            ...baseContext,
            loadedData: [...persistData ? baseContext.loadedData : []],
            lastLoadedPage: undefined,
            noResults: false,
            refreshing: true,
            initialLoadComplete: !!persistData,
        }
        setContext(newContext);
        return loadPage<Model>(setContext, newContext, endpoint, 1);
    }
}

/**
 * Creates the callback that will run the filter
 * @param setContext
 * @param baseContext
 * @param endpoint
 */
function createSetFilterCallback<Model extends BaseModel>(setContext: Dispatch<SetStateAction<BasePaginatedContextState<Model>>>,
                                 baseContext: BasePaginatedContextState<Model>, endpoint: string)
                                 : (key: string, value: number|string|null|undefined) => Promise<Page<Model>> {
    return (key: string, value: number|string|null|undefined): Promise<Page<Model>> => {
        cancelAllPendingRequests(endpoint);

        const filter = baseContext.filter;
        if (value !== null && value !== undefined) {
            filter[key] = value;
        } else {
            delete filter[key];
        }
        const newContext: BasePaginatedContextState<Model> = {
            ...baseContext,
            total: 0,
            loadedData: [],
            initialLoadComplete: false,
            noResults: false,
            lastLoadedPage: undefined,
            filter: {...filter},
        }
        setContext({...newContext});
        return loadPage<Model>(setContext, newContext, endpoint, 1);
    }
}

/**
 * Creates the callback that will run the search
 * @param setContext
 * @param baseContext
 * @param endpoint
 */
function createSetSearchCallback<Model extends BaseModel>(setContext: Dispatch<SetStateAction<BasePaginatedContextState<Model>>>,
                                 baseContext: BasePaginatedContextState<Model>, endpoint: string)
    : (key: string, value: string|null|undefined) => Promise<Page<Model>> {
    return (key: string, value: string|null|undefined): Promise<Page<Model>> => {
        cancelAllPendingRequests(endpoint);

        const search = baseContext.search;
        if (value) {
            search[key] = value;
        } else {
            delete search[key];
        }
        const newContext: BasePaginatedContextState<Model> = {
            ...baseContext,
            total: 0,
            loadedData: [],
            initialLoadComplete: false,
            noResults: false,
            lastLoadedPage: undefined,
            search: {...search},
        }
        setContext({...newContext});
        return loadPage<Model>(setContext, newContext, endpoint, 1, true);
    }
}

/**
 * Creates the callback that will set the order
 * @param setContext
 * @param baseContext
 * @param endpoint
 */
function createSetOrderCallback<Model extends BaseModel>(setContext: Dispatch<SetStateAction<BasePaginatedContextState<Model>>>,
                                baseContext: BasePaginatedContextState<Model>, endpoint: string)
                                : (key: string, direction: 'ASC'|'DESC'|null|undefined) => Promise<Page<Model>> {
    return (key: string, direction: 'ASC'|'DESC'|null|undefined): Promise<Page<Model>> => {
        cancelAllPendingRequests(endpoint);

        const order = {...baseContext.order};
        if (direction) {
            order[key] = direction.toLowerCase() as 'asc'|'desc';
        } else {
            delete order[key];
        }
        const newContext: BasePaginatedContextState<Model> = {
            ...baseContext,
            total: 0,
            loadedData: [],
            initialLoadComplete: false,
            noResults: false,
            lastLoadedPage: undefined,
            order: order,
        }
        setContext({...newContext});
        return loadPage<Model>(setContext, newContext, endpoint, 1);
    }
}

/**
 * Creates the add model callback
 * @param setContext
 * @param baseContext
 */
function createAddModelCallback<Model extends BaseModel>(setContext: Dispatch<SetStateAction<BasePaginatedContextState<Model>>>,
                                baseContext: BasePaginatedContextState<Model>)
                                : (model: Model) => void {
    return (model: Model) => {
        const index = baseContext.loadedData.findIndex(i => i.id === model.id);
        if (index !== -1) {
            baseContext.loadedData[index] = model;
        } else {
            baseContext.total = baseContext.total ? baseContext.total + 1 : 1;
            baseContext.loadedData.unshift(model);
        }
        baseContext.loadedData = [...baseContext.loadedData];
        baseContext.noResults = false;
        setContext({...baseContext});
    }
}

/**
 * Creates the remove model callback for us
 * @param setContext
 * @param baseContext
 */
function createRemoveModelCallback<Model extends BaseModel>(setContext: Dispatch<SetStateAction<BasePaginatedContextState<Model>>>,
                                   baseContext: BasePaginatedContextState<Model>)
                                   : (model: Model) => void {
    return (model: Model) => {
        baseContext.loadedData = [...baseContext.loadedData].filter(i => i.id !== model.id);
        baseContext.total = baseContext.total ? baseContext.total - 1 : 0;
        baseContext.noResults = baseContext.total === 0;
        setContext({...baseContext});
    }
}

/**
 * Creates the get model callback with the current context
 * @param baseContext
 */
function createGetModelCallback<Model extends BaseModel>(baseContext: BasePaginatedContextState<Model>)
                                : (id: number) => Model|null {
    return (id: number): Model|null => {
        const model = baseContext.loadedData.find(i => i.id === id);
        return model || null;
    }
}

/**
 * Prepares the context state based on what is passed in
 * @param setContext
 * @param baseContext
 * @param endpoint
 * @param params
 */
export function prepareContextState<Model extends BaseModel>(
    setContext: Dispatch<SetStateAction<BasePaginatedContextState<Model>>>,
    baseContext: BasePaginatedContextState<Model>,
    endpoint: string,
    params: Record<string, unknown> = {}
): BasePaginatedContextState<Model> {
    baseContext.params = params;
    baseContext = createCallbacks<Model>(setContext, baseContext, endpoint);
    // Better recovery from corrupted state - reload if no data and not refreshing
    const shouldLoad = baseContext.loadedData.length === 0 && !baseContext.refreshing;
    if (shouldLoad) {
        baseContext.initiated = true;
        baseContext.initialLoadComplete = false;
        baseContext.loadNext().catch(console.error);
    }
    return baseContext;
}

/**
 * Creates all callbacks for the context and returns the context
 * @param setContext
 * @param baseContext
 * @param endpoint
 */
export function createCallbacks<Model extends BaseModel>(
    setContext: Dispatch<SetStateAction<BasePaginatedContextState<Model>>>,
    baseContext: BasePaginatedContextState<Model>,
    endpoint: string
): BasePaginatedContextState<Model> {
    baseContext.loadNext = createLoadNextPageCallback<Model>(setContext, baseContext, endpoint);
    baseContext.refreshData = createRefreshDataCallback<Model>(setContext, baseContext, endpoint);
    baseContext.setFilter = createSetFilterCallback<Model>(setContext, baseContext, endpoint);
    baseContext.setSearch = createSetSearchCallback<Model>(setContext, baseContext, endpoint);
    baseContext.setOrder = createSetOrderCallback<Model>(setContext, baseContext, endpoint);
    baseContext.addModel = createAddModelCallback<Model>(setContext, baseContext);
    baseContext.removeModel = createRemoveModelCallback<Model>(setContext, baseContext);
    baseContext.getModel = createGetModelCallback<Model>(baseContext);

    return baseContext;
}

export interface BasePaginatedContextProviderProps {
    notLoadedComponent?: React.Component
}
