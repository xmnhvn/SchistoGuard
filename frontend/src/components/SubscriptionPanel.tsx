import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Bell, MessageSquare, Settings, Upload, FileText, Trash2, RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface SubscriptionSettings {
  smsAlerts: boolean;
  contactsFile?: File;
}

interface SubscriptionPanelProps {
  siteName?: string;
  initialSettings?: Partial<SubscriptionSettings>;
  onSave?: (settings: SubscriptionSettings) => void;
}

export function SubscriptionPanel({ 
  siteName = "All Sites", 
  initialSettings = {}, 
  onSave 
}: SubscriptionPanelProps) {
  const [settings, setSettings] = useState<SubscriptionSettings>({
    smsAlerts: false,
    ...initialSettings
  });
  const [fileName, setFileName] = useState<string>("");
  const [uploadDate, setUploadDate] = useState<string>("");

  const handleToggle = (key: keyof SubscriptionSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSettings(prev => ({
        ...prev,
        contactsFile: file
      }));
      setFileName(file.name);
      setUploadDate(new Date().toLocaleString());
      // Reset the input value to allow re-uploading the same file
      e.target.value = '';
    }
  };

  const handleDeleteFile = () => {
    setSettings(prev => ({
      ...prev,
      contactsFile: undefined
    }));
    setFileName("");
    setUploadDate("");
  };

  const handleSave = () => {
    onSave?.(settings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-schistoguard-teal" />
          Alert Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure notifications for {siteName}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert Types */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Notification Methods
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="sms-alerts" className="text-sm">SMS Alerts</Label>
              </div>
              <Switch
                id="sms-alerts"
                checked={settings.smsAlerts}
                onCheckedChange={() => handleToggle('smsAlerts')}
              />
            </div>
            
            {settings.smsAlerts && (
              <div className="ml-6 space-y-3">
                <p className="text-xs text-muted-foreground">Upload a CSV file with contact numbers</p>
                
                {/* File Upload Section */}
                {!fileName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="contacts-upload"
                    />
                    <Label 
                      htmlFor="contacts-upload"
                      className="flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Choose File
                    </Label>
                  </div>
                ) : (
                  /* Display Uploaded File with CRUD Actions */
                  <div className="p-3 bg-muted/50 rounded-md space-y-3">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-schistoguard-teal mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{fileName}</p>
                        {uploadDate && (
                          <p className="text-xs text-muted-foreground">Uploaded: {uploadDate}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Update/Replace File */}
                      <Input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="contacts-update"
                      />
                      <Label 
                        htmlFor="contacts-update"
                        className="flex items-center gap-2 px-3 py-1.5 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Update
                      </Label>
                      
                      {/* Delete File */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-auto py-1.5 px-3"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete contact file?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the uploaded contact file. You'll need to upload a new file to receive SMS alerts.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteFile}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Button 
          onClick={handleSave}
          className="w-full bg-schistoguard-teal hover:bg-schistoguard-teal/90"
        >
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
