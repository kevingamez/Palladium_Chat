import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { createSheetSheetsCreatePost } from '../api/sdk.gen';

interface SheetCreatorProps {
  onComplete: (message: string) => void;
  conversationId: string;
}

export const SheetCreator: React.FC<SheetCreatorProps> = ({ onComplete, conversationId }) => {
  const createSheet = useMutation({
    mutationFn: async () => {
      const response = await createSheetSheetsCreatePost({
        body: {
          title: "Vendor Consolidation Tracker",
          headers: [
            "Vendor Name", 
            "Services Provided", 
            "Contract Terms", 
            "Compliance Info",
            "Usage Criticality",
            "Status"
          ],
          conversation_id: conversationId
        }
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      const responseMessage = `I've created a vendor inventory spreadsheet with all the necessary fields. You can access it here: ${data.url}`;
      onComplete(responseMessage);
    },
    onError: (error) => {
      onComplete("I'm sorry, I couldn't create the spreadsheet due to an error.");
      console.error("Error creating spreadsheet:", error);
    }
  });

  React.useEffect(() => {
    createSheet.mutate();
  }, []);

  return (
    <div className="ai-action-container">
      <div className="action-status">
        {createSheet.isPending ? (
          <div className="loading-spinner">Creating spreadsheet...</div>
        ) : createSheet.isError ? (
          <div className="error-message">Failed to create spreadsheet</div>
        ) : null}
      </div>
    </div>
  );
};
