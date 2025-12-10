import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
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
import { 
  FileCheck, 
  FileX, 
  FileClock, 
  Users, 
  TrendingUp, 
  GraduationCap, 
  XCircle, 
  CheckCircle,
  ClipboardList,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

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

interface EntranceTestReport {
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  byGrade: { grade: string; avgScore: number; minScore: number; maxScore: number; count: number }[];
  recentResults: {
    id: string;
    applicationNumber: string;
    studentName: string;
    grade: string;
    score: number;
    date: string;
    passed: boolean;
  }[];
}

interface RejectionReport {
  totalRejected: number;
  rejectionRate: number;
  byGrade: { grade: string; count: number }[];
  byReason: { reason: string; count: number }[];
  recentRejections: {
    id: string;
    applicationNumber: string;
    studentName: string;
    grade: string;
    decisionDate: string;
    remarks: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: "hsl(200, 40%, 55%)",
  application_submitted: "hsl(210, 70%, 50%)",
  documents_pending: "hsl(45, 80%, 50%)",
  documents_verified: "hsl(150, 60%, 45%)",
  entrance_test_scheduled: "hsl(200, 70%, 50%)",
  entrance_test_completed: "hsl(180, 60%, 45%)",
  interview_scheduled: "hsl(220, 60%, 55%)",
  interview_completed: "hsl(240, 50%, 55%)",
  under_review: "hsl(270, 60%, 55%)",
  waitlisted: "hsl(30, 70%, 50%)",
  offer_extended: "hsl(180, 50%, 50%)",
  offer_accepted: "hsl(150, 60%, 45%)",
  enrolled: "hsl(120, 60%, 40%)",
  rejected: "hsl(0, 70%, 50%)",
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

  const { data: entranceTestReport, isLoading: loadingEntranceTest } = useQuery<EntranceTestReport>({
    queryKey: ["/api/reports/entrance-test-results"],
  });

  const { data: rejectionReport, isLoading: loadingRejection } = useQuery<RejectionReport>({
    queryKey: ["/api/reports/rejection-analysis"],
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

  const entranceTestGradeData = entranceTestReport?.byGrade
    ? entranceTestReport.byGrade.map((item, index) => ({
        name: item.grade,
        avgScore: item.avgScore,
        count: item.count,
        fill: GRADE_COLORS[index % GRADE_COLORS.length],
      }))
    : [];

  const rejectionGradeData = rejectionReport?.byGrade
    ? rejectionReport.byGrade.map((item, index) => ({
        name: item.grade,
        count: item.count,
        fill: GRADE_COLORS[index % GRADE_COLORS.length],
      }))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Reports</h1>
        <p className="text-muted-foreground mt-1">
          View application statistics, enrollment reports, and analytics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
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
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
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

        <Card data-testid="card-stat-test-pass-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Test Pass Rate
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEntranceTest ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-semibold" data-testid="text-pass-rate">
                {entranceTestReport?.passRate || 0}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-rejection-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejection Rate
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingRejection ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-semibold" data-testid="text-rejection-rate">
                {rejectionReport?.rejectionRate || 0}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-documents-verified">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Docs Verified
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList data-testid="tabs-reports">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="entrance-tests" data-testid="tab-entrance-tests">Entrance Tests</TabsTrigger>
          <TabsTrigger value="rejections" data-testid="tab-rejections">Rejection Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="entrance-tests" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tests
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingEntranceTest ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-semibold">
                    {entranceTestReport?.totalTests || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Passed
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {loadingEntranceTest ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-semibold text-green-600">
                    {entranceTestReport?.passed || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Failed
                </CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                {loadingEntranceTest ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-semibold text-red-600">
                    {entranceTestReport?.failed || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pass Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingEntranceTest ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-semibold">
                    {entranceTestReport?.passRate || 0}%
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Average Scores by Grade</CardTitle>
                <CardDescription>Average entrance test scores across different grades</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingEntranceTest ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : entranceTestGradeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={entranceTestGradeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, "Avg Score"]} />
                      <Bar dataKey="avgScore" name="Average Score" radius={[4, 4, 0, 0]}>
                        {entranceTestGradeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No entrance test data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Test Results</CardTitle>
                <CardDescription>Latest entrance test scores</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingEntranceTest ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : entranceTestReport?.recentResults && entranceTestReport.recentResults.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {entranceTestReport.recentResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="space-y-1">
                          <Link href={`/applications/${result.id}`}>
                            <p className="font-medium hover:underline cursor-pointer" data-testid={`link-test-result-${result.id}`}>
                              {result.studentName}
                            </p>
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {result.applicationNumber} - {result.grade}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-semibold ${result.passed ? "text-green-600" : "text-red-600"}`}>
                            {result.score}%
                          </span>
                          <Badge variant={result.passed ? "default" : "destructive"} className="text-xs">
                            {result.passed ? "Passed" : "Failed"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No test results available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rejections" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Rejected
                </CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                {loadingRejection ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-semibold text-red-600">
                    {rejectionReport?.totalRejected || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rejection Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingRejection ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-semibold">
                    {rejectionReport?.rejectionRate || 0}%
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Unique Reasons
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingRejection ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-semibold">
                    {rejectionReport?.byReason?.length || 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rejections by Grade</CardTitle>
                <CardDescription>Distribution of rejected applications across grades</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRejection ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : rejectionGradeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={rejectionGradeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="count" name="Rejections" fill="hsl(0, 70%, 50%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No rejection data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rejection Reasons</CardTitle>
                <CardDescription>Top reasons for application rejections</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRejection ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : rejectionReport?.byReason && rejectionReport.byReason.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {rejectionReport.byReason.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <p className="text-sm line-clamp-2 flex-1 mr-4">{item.reason}</p>
                        <Badge variant="secondary" className="shrink-0">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No rejection reasons available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Rejections</CardTitle>
              <CardDescription>Latest rejected applications</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRejection ? (
                <Skeleton className="h-[200px] w-full" />
              ) : rejectionReport?.recentRejections && rejectionReport.recentRejections.length > 0 ? (
                <div className="space-y-3">
                  {rejectionReport.recentRejections.map((rejection) => (
                    <div
                      key={rejection.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="space-y-1">
                        <Link href={`/applications/${rejection.id}`}>
                          <p className="font-medium hover:underline cursor-pointer" data-testid={`link-rejection-${rejection.id}`}>
                            {rejection.studentName}
                          </p>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {rejection.applicationNumber} - {rejection.grade}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground max-w-xs line-clamp-2">
                        {rejection.remarks}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {rejection.decisionDate ? format(new Date(rejection.decisionDate), "MMM dd, yyyy") : "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  No recent rejections
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
