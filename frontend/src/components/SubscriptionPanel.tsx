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

  const handleSave = async () => {
    if (!settings.contactsFile || !siteName) {
      alert("Please select a file and site name");
      return;
    }

    try {
      // Read CSV file content
      let csvContent = await settings.contactsFile.text();
      
      // Remove BOM if present
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      
      // Parse lines and auto-detect headers
      const lines = csvContent.trim().split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length === 0) {
        alert("CSV file is empty");
        return;
      }
      
      // Check if first line looks like headers (contains "name", "phone", "contact", etc.)
      const firstLine = lines[0].toLowerCase();
      const headerKeywords = ['name', 'phone', 'contact', 'number', 'mobile'];
      const isHeader = headerKeywords.some(keyword => firstLine.includes(keyword));
      
      // Filter out header row if detected
      const dataLines = isHeader ? lines.slice(1) : lines;
      
      if (dataLines.length === 0) {
        alert("No data rows found in CSV");
        return;
      }
      
      // Rejoin remaining lines
      const cleanCsv = dataLines.join('\n');
      
      // Send to backend
      const response = await fetch('http://localhost:3001/api/sensors/upload-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteName: siteName,
          csv: cleanCsv
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`✓ Successfully uploaded ${data.inserted} residents for ${siteName}`);
        if (data.failed > 0) {
          alert(`⚠ ${data.failed} residents failed to upload`);
        }
        onSave?.(settings);
      } else {
        alert(`✗ Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert(`✗ Error uploading CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card>
     <CardContent className="space-y-6 mt-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between h-[-4] min-h-0 w-full max-w-[340px]">
              <div className="flex items-center gap-4">
                  <MessageSquare className="w-6 h-6 text-schistoguard-navy font-semibold" />
                  <Label htmlFor="sms-alerts" className="text-base font-semibold text-schistoguard-navy">SMS Alerts</Label>
              </div>
              <Switch
                id="sms-alerts"
                checked={settings.smsAlerts}
                onCheckedChange={() => handleToggle('smsAlerts')}
                className="scale-90"
              />
            </div>
            
            <div className="ml-6 space-y-3">
              <p className="text-xs text-muted-foreground">Upload a CSV file with contact numbers</p>
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
                    className="flex items-center gap-2 px-3 py-1.5 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer text-sm h-9 min-h-0"
                  >
                    <Upload className="w-4 h-4" />
                    Choose File
                  </Label>
                </div>
              ) : (
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
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="contacts-update"
                    />
                    <Label 
                      htmlFor="contacts-update"
                      className="flex items-center gap-2 px-3 py-1.5 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer text-xs h-9 min-h-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Update
                    </Label>
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
          </div>
        </div>

        <Button 
          onClick={handleSave}
          className="w-full bg-schistoguard-teal hover:bg-schistoguard-teal/90"
          disabled={!settings.smsAlerts || !settings.contactsFile}
        >
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
