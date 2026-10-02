<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_results', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('course_offering_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('uploaded_by')->constrained('users')->onDelete('cascade');
            $table->string('student_id');          // Matric / student number from CSV
            $table->string('student_name');
            $table->decimal('score', 5, 2);        // Exam / CA score (0–100)
            $table->string('grade')->nullable();   // Computed grade letter
            $table->decimal('attendance_rate', 5, 2)->nullable(); // Joined from attendance
            $table->string('upload_batch')->nullable(); // UUID per upload so duplicates can be replaced
            $table->timestamps();

            $table->index(['course_offering_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_results');
    }
};
