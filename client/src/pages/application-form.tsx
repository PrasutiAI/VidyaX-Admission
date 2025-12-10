import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  User, 
  Users, 
  FileText, 
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AdmissionCycle, InsertAdmissionApplication, Address } from "@shared/schema";
import { gradeOptions, documentTypeEnum } from "@shared/schema";

const steps = [
  { id: 1, title: "Student Info", icon: User },
  { id: 2, title: "Guardian Info", icon: Users },
  { id: 3, title: "Documents", icon: FileText },
  { id: 4, title: "Review", icon: CheckCircle },
];

const initialAddress: Address = {
  street: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

const documentTypeLabels: Record<string, string> = {
  birth_certificate: "Birth Certificate",
  transfer_certificate: "Transfer Certificate",
  previous_report_card: "Previous Report Card",
  category_certificate: "Category Certificate",
  address_proof: "Address Proof",
  passport_photo: "Passport Photo",
  medical_certificate: "Medical Certificate",
  other: "Other Document",
};

interface UploadedDocument {
  id: string;
  type: string;
  fileName: string;
  file?: File;
}

export default function ApplicationForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<string>("");

  const [formData, setFormData] = useState({
    admissionCycleId: "",
    gradeAppliedFor: "",
    studentFirstName: "",
    studentLastName: "",
    dateOfBirth: "",
    gender: "male" as "male" | "female" | "other",
    nationality: "Indian",
    bloodGroup: "",
    fatherName: "",
    fatherOccupation: "",
    fatherContact: "",
    fatherEmail: "",
    motherName: "",
    motherOccupation: "",
    motherContact: "",
    currentAddress: { ...initialAddress },
    permanentAddress: { ...initialAddress },
    previousSchoolName: "",
    previousGrade: "",
    previousMarks: "",
    transferCertificateNumber: "",
    sameAsPermanent: false,
  });

  const { data: cycles, isLoading: cyclesLoading } = useQuery<AdmissionCycle[]>({
    queryKey: ["/api/admission/cycles"],
  });

  const openCycles = cycles?.filter(c => c.status === "open") || [];

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admission/applications", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admission/applications"] });
      toast({ 
        title: "Application Submitted Successfully", 
        description: `Application number: ${data.applicationNumber}` 
      });
      navigate(`/applications/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to submit application", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateAddress = (type: "currentAddress" | "permanentAddress", field: keyof Address, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedDocType) {
      const doc: UploadedDocument = {
        id: Math.random().toString(36).substr(2, 9),
        type: selectedDocType,
        fileName: file.name,
        file,
      };
      setUploadedDocs(prev => [...prev, doc]);
      setSelectedDocType("");
      e.target.value = "";
    }
  };

  const removeDocument = (id: string) => {
    setUploadedDocs(prev => prev.filter(d => d.id !== id));
  };

  const handleSubmit = () => {
    const submitData: Partial<InsertAdmissionApplication> = {
      admissionCycleId: formData.admissionCycleId,
      gradeAppliedFor: formData.gradeAppliedFor,
      studentFirstName: formData.studentFirstName,
      studentLastName: formData.studentLastName,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      nationality: formData.nationality,
      bloodGroup: formData.bloodGroup || undefined,
      fatherName: formData.fatherName,
      fatherOccupation: formData.fatherOccupation || undefined,
      fatherContact: formData.fatherContact,
      fatherEmail: formData.fatherEmail,
      motherName: formData.motherName,
      motherOccupation: formData.motherOccupation || undefined,
      motherContact: formData.motherContact || undefined,
      currentAddress: formData.currentAddress,
      permanentAddress: formData.sameAsPermanent ? formData.currentAddress : formData.permanentAddress,
      previousSchoolName: formData.previousSchoolName || undefined,
      previousGrade: formData.previousGrade || undefined,
      previousMarks: formData.previousMarks || undefined,
      transferCertificateNumber: formData.transferCertificateNumber || undefined,
    };

    submitMutation.mutate(submitData);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.admissionCycleId && 
               formData.gradeAppliedFor && 
               formData.studentFirstName && 
               formData.studentLastName && 
               formData.dateOfBirth &&
               formData.currentAddress.street &&
               formData.currentAddress.city &&
               formData.currentAddress.state &&
               formData.currentAddress.pincode;
      case 2:
        return formData.fatherName && 
               formData.fatherContact && 
               formData.fatherEmail && 
               formData.motherName;
      case 3:
        return true;
      default:
        return true;
    }
  };

  if (cyclesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="New Application" description="Submit a new admission application" />
        <FormSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Application"
        description="Submit a new admission application"
      >
        <Button variant="outline" onClick={() => navigate("/applications")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Button>
      </PageHeader>

      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div 
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    currentStep >= step.id 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <span className={`text-sm font-medium hidden sm:inline ${
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-8 sm:w-16 mx-2 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card className="border-card-border max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg font-medium">{steps[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {currentStep === 1 && "Enter the student's personal information and address"}
            {currentStep === 2 && "Provide guardian details and contact information"}
            {currentStep === 3 && "Upload required documents for the application"}
            {currentStep === 4 && "Review all information before submitting"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cycle">Admission Cycle *</Label>
                  <Select 
                    value={formData.admissionCycleId} 
                    onValueChange={(value) => updateField("admissionCycleId", value)}
                  >
                    <SelectTrigger id="cycle" data-testid="select-cycle">
                      <SelectValue placeholder="Select admission cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {openCycles.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id}>
                          {cycle.cycleName} ({cycle.academicYear})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade Applied For *</Label>
                  <Select 
                    value={formData.gradeAppliedFor}
                    onValueChange={(value) => updateField("gradeAppliedFor", value)}
                  >
                    <SelectTrigger id="grade" data-testid="select-grade">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.studentFirstName}
                    onChange={(e) => updateField("studentFirstName", e.target.value)}
                    placeholder="Enter first name"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.studentLastName}
                    onChange={(e) => updateField("studentLastName", e.target.value)}
                    placeholder="Enter last name"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                    data-testid="input-dob"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={(value) => updateField("gender", value)}
                    className="flex gap-4 pt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" data-testid="radio-male" />
                      <Label htmlFor="male" className="font-normal">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" data-testid="radio-female" />
                      <Label htmlFor="female" className="font-normal">Female</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" data-testid="radio-other" />
                      <Label htmlFor="other" className="font-normal">Other</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Select 
                    value={formData.bloodGroup}
                    onValueChange={(value) => updateField("bloodGroup", value)}
                  >
                    <SelectTrigger id="bloodGroup" data-testid="select-blood-group">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <h3 className="text-sm font-medium">Current Address *</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Textarea
                    id="street"
                    value={formData.currentAddress.street}
                    onChange={(e) => updateAddress("currentAddress", "street", e.target.value)}
                    placeholder="Enter street address"
                    className="resize-none"
                    rows={2}
                    data-testid="input-street"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.currentAddress.city}
                      onChange={(e) => updateAddress("currentAddress", "city", e.target.value)}
                      placeholder="City"
                      data-testid="input-city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.currentAddress.state}
                      onChange={(e) => updateAddress("currentAddress", "state", e.target.value)}
                      placeholder="State"
                      data-testid="input-state"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.currentAddress.pincode}
                      onChange={(e) => updateAddress("currentAddress", "pincode", e.target.value)}
                      placeholder="Pincode"
                      data-testid="input-pincode"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.currentAddress.country}
                      onChange={(e) => updateAddress("currentAddress", "country", e.target.value)}
                      placeholder="Country"
                      data-testid="input-country"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <h3 className="text-sm font-medium">Father's Details</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fatherName">Father's Name *</Label>
                  <Input
                    id="fatherName"
                    value={formData.fatherName}
                    onChange={(e) => updateField("fatherName", e.target.value)}
                    placeholder="Enter father's name"
                    data-testid="input-father-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatherOccupation">Occupation</Label>
                  <Input
                    id="fatherOccupation"
                    value={formData.fatherOccupation}
                    onChange={(e) => updateField("fatherOccupation", e.target.value)}
                    placeholder="Enter occupation"
                    data-testid="input-father-occupation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatherContact">Contact Number *</Label>
                  <Input
                    id="fatherContact"
                    type="tel"
                    value={formData.fatherContact}
                    onChange={(e) => updateField("fatherContact", e.target.value)}
                    placeholder="Enter contact number"
                    data-testid="input-father-contact"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatherEmail">Email *</Label>
                  <Input
                    id="fatherEmail"
                    type="email"
                    value={formData.fatherEmail}
                    onChange={(e) => updateField("fatherEmail", e.target.value)}
                    placeholder="Enter email address"
                    data-testid="input-father-email"
                  />
                </div>
              </div>

              <Separator />

              <h3 className="text-sm font-medium">Mother's Details</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="motherName">Mother's Name *</Label>
                  <Input
                    id="motherName"
                    value={formData.motherName}
                    onChange={(e) => updateField("motherName", e.target.value)}
                    placeholder="Enter mother's name"
                    data-testid="input-mother-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motherOccupation">Occupation</Label>
                  <Input
                    id="motherOccupation"
                    value={formData.motherOccupation}
                    onChange={(e) => updateField("motherOccupation", e.target.value)}
                    placeholder="Enter occupation"
                    data-testid="input-mother-occupation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motherContact">Contact Number</Label>
                  <Input
                    id="motherContact"
                    type="tel"
                    value={formData.motherContact}
                    onChange={(e) => updateField("motherContact", e.target.value)}
                    placeholder="Enter contact number"
                    data-testid="input-mother-contact"
                  />
                </div>
              </div>

              <Separator />

              <h3 className="text-sm font-medium">Previous School Details (Optional)</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="prevSchool">Previous School Name</Label>
                  <Input
                    id="prevSchool"
                    value={formData.previousSchoolName}
                    onChange={(e) => updateField("previousSchoolName", e.target.value)}
                    placeholder="Enter school name"
                    data-testid="input-prev-school"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prevGrade">Previous Grade</Label>
                  <Input
                    id="prevGrade"
                    value={formData.previousGrade}
                    onChange={(e) => updateField("previousGrade", e.target.value)}
                    placeholder="Enter grade"
                    data-testid="input-prev-grade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prevMarks">Previous Marks (%)</Label>
                  <Input
                    id="prevMarks"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.previousMarks}
                    onChange={(e) => updateField("previousMarks", e.target.value)}
                    placeholder="Enter percentage"
                    data-testid="input-prev-marks"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tcNumber">Transfer Certificate No.</Label>
                  <Input
                    id="tcNumber"
                    value={formData.transferCertificateNumber}
                    onChange={(e) => updateField("transferCertificateNumber", e.target.value)}
                    placeholder="Enter TC number"
                    data-testid="input-tc-number"
                  />
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="docType" className="mb-2 block">Document Type</Label>
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger id="docType" data-testid="select-doc-type">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypeEnum.map((type) => (
                          <SelectItem key={type} value={type}>
                            {documentTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                  <input
                    type="file"
                    id="fileUpload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={!selectedDocType}
                    data-testid="input-file-upload"
                  />
                  <label 
                    htmlFor="fileUpload"
                    className={`flex flex-col items-center gap-2 ${selectedDocType ? "cursor-pointer" : "opacity-50"}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">
                      {selectedDocType ? "Click to upload or drag and drop" : "Select a document type first"}
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, JPG, JPEG, PNG (max 5MB)</p>
                  </label>
                </div>

                {uploadedDocs.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Documents</Label>
                    <div className="space-y-2">
                      {uploadedDocs.map((doc) => (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.fileName}</p>
                              <p className="text-xs text-muted-foreground">{documentTypeLabels[doc.type]}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDocument(doc.id)}
                            data-testid={`button-remove-doc-${doc.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  You can upload documents now or after submitting the application. Required documents vary by grade.
                </p>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-medium">Student Information</h3>
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name: </span>
                    <span className="font-medium">{formData.studentFirstName} {formData.studentLastName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Grade: </span>
                    <span className="font-medium">{gradeOptions.find(g => g.id === formData.gradeAppliedFor)?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date of Birth: </span>
                    <span className="font-medium">{formData.dateOfBirth}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender: </span>
                    <span className="font-medium capitalize">{formData.gender}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-medium">Guardian Information</h3>
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Father: </span>
                    <span className="font-medium">{formData.fatherName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact: </span>
                    <span className="font-medium">{formData.fatherContact}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span className="font-medium">{formData.fatherEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mother: </span>
                    <span className="font-medium">{formData.motherName}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-medium">Address</h3>
                <p className="text-sm">
                  {formData.currentAddress.street}, {formData.currentAddress.city}, {formData.currentAddress.state} - {formData.currentAddress.pincode}, {formData.currentAddress.country}
                </p>
              </div>

              {uploadedDocs.length > 0 && (
                <div className="rounded-lg border p-4 space-y-4">
                  <h3 className="font-medium">Documents ({uploadedDocs.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {uploadedDocs.map((doc) => (
                      <span key={doc.id} className="text-sm bg-muted px-2 py-1 rounded">
                        {documentTypeLabels[doc.type]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={currentStep === 1}
              data-testid="button-previous"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                data-testid="button-next"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
