import React from 'react';

const ZipValidationLoader = () => {
  return (
    <div className="zip-validation-loader" aria-label="Validating ZIP code">
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
    </div>
  );
};

export default ZipValidationLoader;