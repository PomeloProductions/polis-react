import BaseModel from '../base-model';

export interface UserPageComponent extends BaseModel {
    user_page_id: number;
    component_type: string;
    display_order: number;
    config_json: Record<string, unknown> | null;
}

export interface UserPage extends BaseModel {
    slug: string;
    name: string;
    icon: string;
    color: string | null;
    route_path: string;
    page_type: string;
    display_order: number;
    is_visible: boolean;
    is_required: boolean;
    is_nav_item: boolean;
    parent_page_id: number | null;
    config_json: Record<string, unknown> | null;
    components: UserPageComponent[];
}
