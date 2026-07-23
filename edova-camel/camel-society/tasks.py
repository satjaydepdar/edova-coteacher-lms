# camel_society/tasks.py
from camel.societies import RolePlaying
from camel.tasks import Task
from .agents import get_ch6_agents

def run_ch6_society(user_topic: str, duration: int = 45):
    agents = get_ch6_agents()

    # Define the CAMEL Tasks - this is the config
    task1 = Task(
        content=f"Extract curriculum context for '{user_topic}' from Chapter 6 Triangles.",
        role="CBSE Curriculum Specialist",
    )
    task2 = Task(
        content=f"Using context, design {duration} min lesson flow for '{user_topic}'.",
        role="NEP 2020 Master Teacher",
        additional_info="Must depend on Task 1 output"
    )
    task3 = Task(
        content=f"Create assessment for '{user_topic}'.",
        role="CBSE Paper Setter",
        additional_info="Use same context as Task 2"
    )
    task4 = Task(
        content="Review combined draft from Task 2 and 3 for compliance.",
        role="HOD / Principal",
    )

    # This is the actual CAMEL Society
    society = RolePlaying(
        assistant_role_name="NEP 2020 Master Teacher",
        user_role_name="CBSE Curriculum Specialist",
        assistant_agent=agents["pedagogy"],
        user_agent=agents["curriculum"],
        task=task2, # Main task
        with_task_specify=False
    )
    
    # Simplified execution for your use case:
    # CAMEL 0.2.x way - you orchestrate sequentially
    ctx = agents["curriculum"].step(task1.content)
    pedagogy_out = agents["pedagogy"].step(f"Context: {ctx.msg.content} | Topic: {user_topic}")
    assessment_out = agents["assessment"].step(f"Context: {ctx.msg.content} | Topic: {user_topic}")
    
    draft = pedagogy_out.msg.content + assessment_out.msg.content
    critique_out = agents["critique"].step(f"Review this draft: {draft}")

    return {
        "curriculum": ctx.msg.content,
        "lesson": pedagogy_out.msg.content,
        "assessment": assessment_out.msg.content,
        "critique": critique_out.msg.content
    }   