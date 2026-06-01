import React, {PropsWithChildren, useCallback, useEffect, useState} from 'react';
import Category from '../models/category';
import {generateEmptyCategory} from '../util/category-utils';
import CategoryRequests from '../services/requests/CategoryRequests';
import LoadingScreen from '../components/LoadingScreen';

let cachedCategories = [] as Category[];

/**
 * The structure of the consumer
 */
export interface CategoryContextConsumerState {
    hasLoaded: boolean,
    notFound: boolean,
    category: Category,
    setCategory: (category: Category) => void,
}

let defaultContext: CategoryContextConsumerState = {
    hasLoaded: false,
    notFound: false,
    category: generateEmptyCategory(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setCategory: (_category: Category) => {}
};

export const CategoryContext = React.createContext<CategoryContextConsumerState>(defaultContext);

export interface CategoryContextProviderProps {
    categoryId: number,
    skipCache?: boolean,
}

export const CategoryContextProvider: React.FC<PropsWithChildren<CategoryContextProviderProps>> = ({categoryId, skipCache, children}) => {
    const [categoryState, setCategoryState] = useState(defaultContext);

    const setCategory = useCallback((newCategory: Category): void => {
        cachedCategories[newCategory.id!] = {...newCategory};
        setCategoryState(prevState => ({
            ...prevState,
            category: newCategory,
        }));
    }, []);

    useEffect(() => {
        if (!skipCache && cachedCategories[categoryId]) {
            setCategoryState({
                hasLoaded: true,
                notFound: false,
                category: cachedCategories[categoryId],
                setCategory: setCategory,
            });
        } else {
            setCategoryState(prevState => ({
                ...prevState,
                hasLoaded: false,
                setCategory: setCategory,
            }));
            CategoryRequests.getCategory(categoryId).then(apiCategory => {
                cachedCategories[categoryId] = apiCategory;
                setCategoryState(prevState => ({
                    ...prevState,
                    hasLoaded: true,
                    notFound: false,
                    category: apiCategory,
                    setCategory: setCategory,
                }));
            }).catch(() => {
                setCategoryState(prevState => ({
                    ...prevState,
                    hasLoaded: true,
                    notFound: true,
                    setCategory: setCategory,
                }));
            })
        }
    }, [categoryId, skipCache, setCategory]);

    return (
        <CategoryContext.Provider value={{...categoryState, setCategory}}>
            <CategoryContext.Consumer>
                {context => (context.hasLoaded ?
                    (!context.notFound ? children :
                        <div className={'category-not-found'}>
                            Not Found
                        </div>
                    ) : <LoadingScreen/>
                )}
            </CategoryContext.Consumer>
        </CategoryContext.Provider>
    )
}
