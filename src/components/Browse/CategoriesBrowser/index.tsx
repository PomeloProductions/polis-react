import React from 'react';
import './index.scss';
import { CategoriesContext, CategoriesContextProvider } from '../../../contexts/CategoriesContext';
import CategoriesList from "./CategoriesList";

const CategoriesBrowser: React.FC = () => {
    return (
        <CategoriesContextProvider>
            <CategoriesContext.Consumer>
                {context =>
                    <CategoriesList contextState={context}/>
                }
            </CategoriesContext.Consumer>
        </CategoriesContextProvider>
    )
}

export default CategoriesBrowser; 