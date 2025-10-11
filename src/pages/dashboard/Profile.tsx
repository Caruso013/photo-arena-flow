import { ProfileEditor } from '@/components/profile/ProfileEditor';

const Profile = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais
        </p>
      </div>
      <ProfileEditor />
    </div>
  );
};

export default Profile;
