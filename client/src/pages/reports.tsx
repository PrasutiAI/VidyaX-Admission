import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { FileCheck, FileX, FileClock, Users, TrendingUp } from "lucide-react";

interface ApplicationSummary {
  byStatus: { status: string; count: number }[];
  byGrade: { grade: string; count: number }[];
}

interface EnrollmentReport {
  totalEnrolled: number;
  enrolledStudents: any[];
  byGrade: { grade: string; enrolled: number; total: number }[];
}

interface DocumentVerificationReport {
  totalDocuments: number;
  verified: number;
  pending: number;
  rejected: number;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "hsl(210, 70%, 50%)",
  under_review: "hsl(45, 80%, 50%)",
  entrance_test_scheduled: "hsl(200, 70%, 50%)",
  interview_scheduled: "hsl(180, 60%, 45%)",
  offer_generated: "hsl(270, 60%, 55%)",
  offer_accepted: "hsl(150, 60%, 45%)",
  enrolled: "hsl(120, 60%, 40%)",
  rejected: "hsl(0, 70%, 50%)",
  waitlisted: "hsl(30, 70%, 50%)",
  withdrawn: "hsl(0, 0%, 50%)",
};

const GRADE_COLORS = [
  "hsl(210, 70%, 50%)",
  "hsl(180, 60%, 45%)",
  "hsl(150, 60%, 45%)",
  "hsl(120, 60%, 40%)",
  "hsl(90, 50%, 45%)",
  "hsl(60, 60%, 45%)",
  "hsl(30, 70%, 50%)",
  "hsl(0, 70%, 50%)",
  "hsl(270, 60%, 55%)",
  "hsl(300, 50%, 50%)",
];

export default function Reports() {
  const { data: applicationSummary, isLoading: loadingSummary } = useQuery<ApplicationSummary>({
    queryKey: ["/api/reports/application-summary"],
  });

  const { data: enrollmentReport, isLoading: loadingEnrollment } = useQuery<EnrollmentReport>({
    queryKey: ["/api/reports/enrollment"],
  });

  const { data: documentReport, isLoading: loadingDocuments } = useQuery<DocumentVerificationReport>({
    queryKey: ["/api/reports/document-verification"],
  });

  const totalApplications = applicationSummary?.byStatus?.reduce((sum, s) => sum + s.count, 0) || 0;
  
  const statusChartData = applicationSummary?.byStatus
    ? applicationSummary.byStatus.map((item) => ({
        name: item.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: item.count,
        fill: STATUS_COLORS[item.status] || "hsl(0, 0%, 60%)",
      }))
    : [];

  const gradeChartData = applicationSummary?.byGrade
    ? applicationSummary.byGrade.map((item, index) => ({
        name: item.grade,
        applications: item.count,
        fill: GRADE_COLORS[index % GRADE_COLORS.length],
      }))
    : [];

  const enrollmentChartData = enrollmentReport?.byGrade
    ? enrollmentReport.byGrade.map((item, index) => ({
        name: item.grade,
        enrolled: item.enrolled,
        total: item.total,
        rate: item.total > 0 ? Math.round((item.enrolled / item.total) * 100) : 0,
        fill: GRADE_COLORS[index % GRADE_COLORS.length],
      }))
    : [];

  const documentPieData = documentReport
    ? [
        { name: "Verified", value: documentReport.verified, fill: "hsl(120, 60%, 40%)" },
        { name: "Pending", value: documentReport.pending, fill: "hsl(45, 80%, 50%)" },
        { name: "Rejected", value: documentReport.rejected, fill: "hsl(0, 70%, 50%)" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Reports</h1>
        <p className="text-muted-foreground mt-1">
          View application statistics and enrollment reports
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-total-applications">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Applications
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-semibold" data-testid="text-total-applications">
                {totalApplications}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-total-enrolled">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Enrolled
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEnrollment ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-semibold" data-testid="text-total-enrolled">
                {enrollmentReport?.totalEnrolled || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-enrollment-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enrollment Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEnrollment ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-semibold" data-testid="text-enrollment-rate">
                {totalApplications > 0 ? Math.round(((enrollmentReport?.totalEnrolled || 0) / totalApplications) * 100) : 0}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-documents-verified">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documents Verified
            </CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingDocuments ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold" data-testid="text-documents-verified">
                  {documentReport?.verified || 0}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {documentReport?.totalDocuments || 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-chart-status-distribution">
          <CardHeader>
            <CardTitle>Applications by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-[300px] w-full" />
            ) : statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No application data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-chart-grade-distribution">
          <CardHeader>
            <CardTitle>Applications by Grade</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-[300px] w-full" />
            ) : gradeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="applications" radius={[0, 4, 4, 0]}>
                    {gradeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No grade data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-chart-enrollment">
          <CardHeader>
            <CardTitle>Enrollment by Grade</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEnrollment ? (
              <Skeleton className="h-[300px] w-full" />
            ) : enrollmentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={enrollmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      value,
                      name === "enrolled" ? "Enrolled" : "Total Applications",
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="total" name="Total Applications" fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="enrolled" name="Enrolled" fill="hsl(120, 60%, 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No enrollment data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-chart-documents">
          <CardHeader>
            <CardTitle>Document Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDocuments ? (
              <Skeleton className="h-[300px] w-full" />
            ) : documentReport && documentReport.totalDocuments > 0 ? (
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={documentPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {documentPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <FileCheck className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-semibold">{documentReport.verified}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Verified</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <FileClock className="h-4 w-4 text-yellow-600" />
                      <span className="text-lg font-semibold">{documentReport.pending}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <FileX className="h-4 w-4 text-red-600" />
                      <span className="text-lg font-semibold">{documentReport.rejected}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No document data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
