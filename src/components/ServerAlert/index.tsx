import React from 'react'
import {RequestError} from '../../models/request-error';

interface ServerAlertProps {
	requestError: RequestError
}

const ServerAlert: React.FC<ServerAlertProps> = ({ requestError }) => {

	let message = undefined;
	let field: string|undefined = undefined;
	const errors = requestError.data.errors;
	if (errors) {
		const keys = Object.keys(errors);
		field = keys.length ? keys[0] : undefined;
		message = field ? errors[field].pop() : undefined;
	}

	if (!message) {
		message = 'Unknown Error';
	}
	return <p>{message}</p>
	// return (
	// 	<IonAlert
	// 		isOpen={true}
	// 		onDidDismiss={() => onCloseAlert( false, field )}
	// 		header={'Error'}
	// 		message={message}
	// 		buttons={[
	// 			{
	// 				text: 'Update',
	// 				handler: () => {
	// 					onCloseAlert( true, field )
	// 				}
	// 			}
	// 		]}
	// 	/>
	// )
}

export default ServerAlert
