import React from 'react';
import { InputFieldProps } from '../types';

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  id, 
  name,
  type = 'text',
  value, 
  onChange, 
  onBlur,
  placeholder, 
  required, 
  Icon, 
  readOnly = false, 
  className = '',
  maxLength,
  pattern,
  min
}) => {
  return (
    <div className="mb-6">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}
        <input
          type={type}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          maxLength={maxLength}
          pattern={pattern}
          min={min}
          className={`w-full p-3 ${Icon ? 'pl-10' : ''} border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 focus:ring-primary focus:border-primary transition duration-150 ease-in-out ${readOnly ? 'bg-gray-600 cursor-not-allowed' : ''} ${className}`}
        />
      </div>
    </div>
  );
};

export default InputField;
