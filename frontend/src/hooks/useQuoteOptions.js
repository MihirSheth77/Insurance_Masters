import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useQuoteOptions = () => {
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const navigate = useNavigate();

  const openQuoteOptions = () => {
    setShowOptionsModal(true);
  };

  const closeQuoteOptions = () => {
    setShowOptionsModal(false);
  };

  const handleQuoteStart = (type) => {
    closeQuoteOptions();
    
    switch (type) {
      case 'new':
        navigate('/quote/new/group');
        break;
      case 'existing':
        navigate('/quote/select-group');
        break;
      case 'clone':
        navigate('/quotes/history?action=clone');
        break;
      default:
        navigate('/quote/new/group');
    }
  };

  return {
    showOptionsModal,
    openQuoteOptions,
    closeQuoteOptions,
    handleQuoteStart
  };
};

export default useQuoteOptions;