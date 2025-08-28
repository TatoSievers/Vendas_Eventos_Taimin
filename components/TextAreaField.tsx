
import React from 'react';
import { TextAreaFieldProps } from '../types';

const TextAreaField: React.FC<TextAreaFieldProps> = ({ label, id, value, onChange, placeholder, rows = 3, required, name, Icon }) => {
  return (
    <div className="mb-6">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
         {Icon && (
          <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className={`w-full p-3 ${Icon ? 'pl-10' : ''} border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white placeholder-gray-400 focus:ring-primary focus:border-primary transition duration-150 ease-in-out`}
        />
      </div>
    </div>
  );
};

export default TextAreaField;
