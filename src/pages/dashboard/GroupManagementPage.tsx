import GroupManagement from "@/components/discipleship/GroupManagement";

const GroupManagementPage = () => {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Gestión de Grupos de Discipulado
        </h1>
        <p className="text-muted-foreground mt-1">
          Crea grupos familiares y asigna supervisores y líderes
        </p>
      </header>

      <section aria-labelledby="groups-management">
        <GroupManagement />
      </section>
    </div>
  );
};

export default GroupManagementPage;
