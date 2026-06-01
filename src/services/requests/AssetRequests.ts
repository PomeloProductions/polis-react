import api from '../api';
import Asset from '../../models/asset';

export default class AssetRequests {

    /**
     * Runs the sign up request, and then get the full user information off the server
     * @param endpoint
     * @param fileContents
     * @param caption
     */
    static async uploadAsset(endpoint: string, fileContents: string, caption: string|null = null): Promise<Asset> {
        const {data} = await api.post(endpoint, {
            file_contents: fileContents,
            caption: caption,
        });

        return data as Asset;
    }
}
