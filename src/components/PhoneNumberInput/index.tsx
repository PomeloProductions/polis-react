import React, {HTMLAttributes, useEffect, useRef} from 'react';

interface PhoneNumberInputProps  extends HTMLAttributes<HTMLInputElement> {
    name: string,
    value: string,
    onPhoneNumberChange:(phoneNumber: string) => void,
    onInputSet?: (input: HTMLInputElement) => void,
    placeholder?: string,
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({name, value, placeholder, onPhoneNumberChange, onInputSet, ...rest}) => {

    const phoneInputRef = useRef<HTMLInputElement>(null)
    const onDecoratedChange = (decoratedValue: string) => {
        const undecoratedValue = decoratedValue.replace(/[() -]/g, '')
        onPhoneNumberChange(undecoratedValue)
    }

    useEffect(() => {
        if (onInputSet && phoneInputRef.current) {
            onInputSet(phoneInputRef.current);
        }
    }, [onInputSet])

    return (
        <input
            type={'tel'}
            name={name}
            value={decoratePhoneNumber(value)}
            maxLength={14}
            placeholder={placeholder}
            onChange={(event) => onDecoratedChange(event.target.value)}
            autoComplete={"tel"}
            ref={phoneInputRef}
            {...rest}
        />
    )
}

export function decoratePhoneNumber(phoneNumber: string): string {
    const numberParts = phoneNumber.match(/[0-9]{0,3}/g) ?? []
    const decoratedParts = numberParts.map((numberSet, index) => {
        if(index === 0 && numberSet.length) {
            numberSet = '(' + numberSet
        }
        else if(index === 1 && numberSet.length) {
            numberSet = ') ' + numberSet
        }
        else if(index === 2 && numberSet.length) {
            numberSet = '-' + numberSet
        }
        return numberSet
    })
    return decoratedParts.join('')
}

export default PhoneNumberInput
