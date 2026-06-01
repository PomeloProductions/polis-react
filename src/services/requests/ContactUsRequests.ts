import api from '../api';

interface ContactFormData {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export default class ContactUsRequests {

    /**
     * Submits the general contact form for us
     * @param contactData
     */
    static async submitGeneralContact(contactData: ContactFormData): Promise<unknown> {
        const { data } = await api.post('/general-contact ', contactData);

        return data;
    }
}
