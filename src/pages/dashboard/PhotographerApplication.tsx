import { PhotographerApplicationForm } from '@/components/dashboard/PhotographerApplicationForm';

const PhotographerApplication = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Seja um Fotógrafo</h1>
        <p className="text-muted-foreground">
          Preencha o formulário abaixo para se candidatar como fotógrafo na plataforma
        </p>
      </div>

      <PhotographerApplicationForm />
    </div>
  );
};

export default PhotographerApplication;
