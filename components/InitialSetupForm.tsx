

import React, { useState, useEffect } from 'react';
import { InitialSetupFormProps as InitialSetupFormPropsType } from '../types';
import InputField from './InputField';
import { UserIcon, CalendarDaysIcon, TagIcon } from './icons';

const ADD_NEW_SENTINEL = "ADD_NEW_SENTINEL_VALUE"; // Generic sentinel for both user and event


const InitialSetupForm: React.FC<InitialSetupFormPropsType> = ({ onSetupComplete, uniqueEvents, uniqueUsers, onCreateUser, onCreateEvent }) => {
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [newUserName, setNewUserName] = useState<string>('');
  const [showNewUserInput, setShowNewUserInput] = useState<boolean>(false);

  const [selectedEventName, setSelectedEventName] = useState<string>('');
  const [newEventName, setNewEventName] = useState<string>('');
  const [showNewEventInput, setShowNewEventInput] = useState<boolean>(false);
  
  const [eventDate, setEventDate] = useState<string>('');
  const [isEventDateReadOnly, setIsEventDateReadOnly] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    // Auto-fill event date if an existing event is selected
    if (!showNewEventInput && selectedEventName) {
      const event = uniqueEvents.find(ev => ev.name === selectedEventName);
      if (event) {
        setEventDate(event.date);
        setIsEventDateReadOnly(true);
      }
    } else {
      setIsEventDateReadOnly(false);
    }
  }, [selectedEventName, uniqueEvents, showNewEventInput]);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === ADD_NEW_SENTINEL) {
      setShowNewUserInput(true);
      setSelectedUserName(''); 
      setNewUserName('');
    } else {
      setShowNewUserInput(false);
      setSelectedUserName(value);
      setNewUserName(''); // Clear new user input if existing is selected
    }
  };

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === ADD_NEW_SENTINEL) {
      setShowNewEventInput(true);
      setSelectedEventName('');
      setNewEventName('');
      setEventDate(''); // Clear date for new event
      setIsEventDateReadOnly(false);
    } else {
      setShowNewEventInput(false);
      setSelectedEventName(value);
      setNewEventName(''); // Clear new event input
      // Date and read-only status will be set by useEffect
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const finalUserName = showNewUserInput ? newUserName.trim() : selectedUserName;
    const finalEventName = showNewEventInput ? newEventName.trim() : selectedEventName;

    if (!finalUserName) {
      setErrorMessage("Por favor, selecione ou cadastre um nome de usuário.");
      setIsSubmitting(false);
      return;
    }
    if (!finalEventName) {
      setErrorMessage("Por favor, selecione ou cadastre um nome de evento.");
      setIsSubmitting(false);
      return;
    }
    if (!eventDate) {
      setErrorMessage("Por favor, insira a data do evento.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (showNewUserInput && finalUserName) {
        await onCreateUser(finalUserName);
      }
      if (showNewEventInput && finalEventName) {
        await onCreateEvent(finalEventName, eventDate);
      }
      
      onSetupComplete({
        userName: finalUserName,
        eventName: finalEventName,
        eventDate: eventDate,
      });

    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-slate-800 p-8 md:p-10 rounded-xl shadow-2xl">
      <h2 className="text-3xl font-semibold text-center text-white mb-8">Configuração Inicial</h2>
      {errorMessage && (
        <div className="p-3 mb-4 rounded-md text-sm bg-red-500 text-white">
          {errorMessage}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Selection/Creation */}
        <div>
          <label htmlFor="userSelector" className="block text-sm font-medium text-gray-300 mb-1">
            Nome do Usuário <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="userSelector"
              value={showNewUserInput ? ADD_NEW_SENTINEL : selectedUserName}
              onChange={handleUserChange}
              required={!showNewUserInput}
              className="w-full p-3 pl-10 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary focus:border-primary"
            >
              <option value="">-- Selecione um usuário --</option>
              {uniqueUsers.map(user => (
                <option key={user.name} value={user.name}>{user.name}</option>
              ))}
              <option value={ADD_NEW_SENTINEL}>Cadastrar Novo Usuário...</option>
            </select>
          </div>
          {showNewUserInput && (
            <InputField
              label=""
              id="newUserName"
              name="newUserName" // Unique name for this field
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Digite o nome do novo usuário"
              required={showNewUserInput}
              Icon={UserIcon}
              className="mt-3"
            />
          )}
        </div>

        {/* Event Selection/Creation */}
        <div>
          <label htmlFor="eventSelector" className="block text-sm font-medium text-gray-300 mb-1">
            Nome do Evento <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <TagIcon className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="eventSelector"
              value={showNewEventInput ? ADD_NEW_SENTINEL : selectedEventName}
              onChange={handleEventChange}
              required={!showNewEventInput}
              className="w-full p-3 pl-10 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:ring-primary focus:border-primary"
            >
              <option value="">-- Selecione um evento --</option>
              {uniqueEvents.map(event => (
                <option key={event.name} value={event.name}>{event.name}</option>
              ))}
              <option value={ADD_NEW_SENTINEL}>Cadastrar Novo Evento...</option>
            </select>
          </div>
          {showNewEventInput && (
            <InputField
              label=""
              id="newEventName"
              name="newEventName" // Unique name
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder="Digite o nome do novo evento"
              required={showNewEventInput}
              Icon={TagIcon}
              className="mt-3"
            />
          )}
        </div>
        
        <InputField
            label="Data do Evento"
            id="eventDateSetup" // Unique ID
            name="dataEvento" // This can map to SalesFormData if needed, but here it's for setup state
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
            Icon={CalendarDaysIcon}
            readOnly={isEventDateReadOnly}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Salvando...' : 'Iniciar Registros'}
        </button>
      </form>
    </div>
  );
};

export default InitialSetupForm;