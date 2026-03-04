export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agenda: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_hora_fim: string | null
          data_hora_inicio: string | null
          data_prazo: string
          descricao: string | null
          id: string
          processo_id: string | null
          responsavel_id: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_hora_fim?: string | null
          data_hora_inicio?: string | null
          data_prazo: string
          descricao?: string | null
          id?: string
          processo_id?: string | null
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_hora_fim?: string | null
          data_hora_inicio?: string | null
          data_prazo?: string
          descricao?: string | null
          id?: string
          processo_id?: string | null
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      andamentos: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          descricao: string
          id: string
          processo_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          descricao: string
          id?: string
          processo_id: string
          tipo?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string
          id?: string
          processo_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "andamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimentos: {
        Row: {
          cliente_nome: string | null
          cliente_whatsapp: string | null
          id: string
          instancia_id: string | null
          status_ia: boolean | null
          ultima_mensagem: string | null
          updated_at: string | null
        }
        Insert: {
          cliente_nome?: string | null
          cliente_whatsapp?: string | null
          id?: string
          instancia_id?: string | null
          status_ia?: boolean | null
          ultima_mensagem?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente_nome?: string | null
          cliente_whatsapp?: string | null
          id?: string
          instancia_id?: string | null
          status_ia?: boolean | null
          ultima_mensagem?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_instancia_id_fkey"
            columns: ["instancia_id"]
            isOneToOne: false
            referencedRelation: "instancias"
            referencedColumns: ["id"]
          },
        ]
      }
      aux_assuntos: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      aux_comarcas: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      aux_fases: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cpf: string | null
          created_at: string
          created_by: string | null
          data_contratacao: string | null
          endereco_cep: string | null
          estado_civil: string | null
          id: string
          nacionalidade: string | null
          nome_completo: string
          orgao_expedidor: string | null
          profissao: string | null
          rg: string | null
          status_cliente: string
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_contratacao?: string | null
          endereco_cep?: string | null
          estado_civil?: string | null
          id?: string
          nacionalidade?: string | null
          nome_completo: string
          orgao_expedidor?: string | null
          profissao?: string | null
          rg?: string | null
          status_cliente?: string
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_contratacao?: string | null
          endereco_cep?: string | null
          estado_civil?: string | null
          id?: string
          nacionalidade?: string | null
          nome_completo?: string
          orgao_expedidor?: string | null
          profissao?: string | null
          rg?: string | null
          status_cliente?: string
          updated_at?: string
        }
        Relationships: []
      }
      controle_atendimento: {
        Row: {
          atendente_id: string | null
          bot_ativo: boolean | null
          modulo_origem: string | null
          status_funil: string | null
          whatsapp_id: string
        }
        Insert: {
          atendente_id?: string | null
          bot_ativo?: boolean | null
          modulo_origem?: string | null
          status_funil?: string | null
          whatsapp_id: string
        }
        Update: {
          atendente_id?: string | null
          bot_ativo?: boolean | null
          modulo_origem?: string | null
          status_funil?: string | null
          whatsapp_id?: string
        }
        Relationships: []
      }
      controle_bot: {
        Row: {
          bot_ativo: boolean | null
          last_intercept: string | null
          whatsapp_numero: string
        }
        Insert: {
          bot_ativo?: boolean | null
          last_intercept?: string | null
          whatsapp_numero: string
        }
        Update: {
          bot_ativo?: boolean | null
          last_intercept?: string | null
          whatsapp_numero?: string
        }
        Relationships: []
      }
      fases_processo: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      historico_mensagens: {
        Row: {
          conteudo: string | null
          created_at: string | null
          direcao: string | null
          id: string
          tipo_midia: string | null
          whatsapp_id: string | null
        }
        Insert: {
          conteudo?: string | null
          created_at?: string | null
          direcao?: string | null
          id?: string
          tipo_midia?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          conteudo?: string | null
          created_at?: string | null
          direcao?: string | null
          id?: string
          tipo_midia?: string | null
          whatsapp_id?: string | null
        }
        Relationships: []
      }
      honorarios: {
        Row: {
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string
          id: string
          processo_id: string
          status: string
          tipo_honorario: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao: string
          id?: string
          processo_id: string
          status?: string
          tipo_honorario?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string
          id?: string
          processo_id?: string
          status?: string
          tipo_honorario?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "honorarios_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      instancias: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          status: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          status?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          status?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          conteudo: string
          created_at: string
          data_movimentacao: string
          descricao: string | null
          fonte: string
          id: string
          lida: boolean
          orgao: string | null
          processo_id: string
          tipo_movimentacao: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          data_movimentacao: string
          descricao?: string | null
          fonte: string
          id?: string
          lida?: boolean
          orgao?: string | null
          processo_id: string
          tipo_movimentacao: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          data_movimentacao?: string
          descricao?: string | null
          fonte?: string
          id?: string
          lida?: boolean
          orgao?: string | null
          processo_id?: string
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          acordao_decisao: string | null
          adverso: string | null
          area_atuacao: string | null
          assunto: string | null
          assunto_id: string | null
          camara_turma: string | null
          capturar_andamentos: boolean | null
          cliente_id: string
          comarca: string | null
          comarca_id: string | null
          contingencia: number | null
          created_at: string
          created_by: string | null
          data_acordao: string | null
          data_contratacao: string | null
          data_distribuicao: string | null
          data_encerramento: string | null
          data_execucao: string | null
          data_sentenca: string | null
          data_transito_julgado: string | null
          data_ultima_movimentacao: string | null
          detalhes: string | null
          escavador_id: string | null
          etiqueta: string | null
          fase: string | null
          fase_id: string | null
          grupo: string | null
          grupo_acao: string | null
          grupo_cliente: string | null
          honorarios_percentual: number | null
          id: string
          juiz_1_grau: string | null
          local_tramite: string | null
          localizador: string | null
          numero_antigo: string | null
          numero_cnj: string | null
          numero_processo: string | null
          objeto_acao: string | null
          observacao: string | null
          observacoes: string | null
          origem: string | null
          outro_valor: number | null
          parceiro: string | null
          partes_requeridas: string | null
          pasta: string | null
          pedido: string | null
          processo_pai_id: string | null
          prognostico:
            | Database["public"]["Enums"]["prognostico_processo"]
            | null
          relator_2_grau: string | null
          responsavel: string | null
          segredo_justica: boolean | null
          situacao: Database["public"]["Enums"]["situacao_processo"] | null
          status: string
          status_1_grau: string | null
          status_2_grau: string | null
          status_pagamento_honorarios: string | null
          status_processual: string | null
          tipo_processo: string | null
          uf: string | null
          updated_at: string
          valor_acordo: number | null
          valor_causa: number | null
          valor_execucao: number | null
          valor_sentenca: number | null
        }
        Insert: {
          acordao_decisao?: string | null
          adverso?: string | null
          area_atuacao?: string | null
          assunto?: string | null
          assunto_id?: string | null
          camara_turma?: string | null
          capturar_andamentos?: boolean | null
          cliente_id: string
          comarca?: string | null
          comarca_id?: string | null
          contingencia?: number | null
          created_at?: string
          created_by?: string | null
          data_acordao?: string | null
          data_contratacao?: string | null
          data_distribuicao?: string | null
          data_encerramento?: string | null
          data_execucao?: string | null
          data_sentenca?: string | null
          data_transito_julgado?: string | null
          data_ultima_movimentacao?: string | null
          detalhes?: string | null
          escavador_id?: string | null
          etiqueta?: string | null
          fase?: string | null
          fase_id?: string | null
          grupo?: string | null
          grupo_acao?: string | null
          grupo_cliente?: string | null
          honorarios_percentual?: number | null
          id?: string
          juiz_1_grau?: string | null
          local_tramite?: string | null
          localizador?: string | null
          numero_antigo?: string | null
          numero_cnj?: string | null
          numero_processo?: string | null
          objeto_acao?: string | null
          observacao?: string | null
          observacoes?: string | null
          origem?: string | null
          outro_valor?: number | null
          parceiro?: string | null
          partes_requeridas?: string | null
          pasta?: string | null
          pedido?: string | null
          processo_pai_id?: string | null
          prognostico?:
            | Database["public"]["Enums"]["prognostico_processo"]
            | null
          relator_2_grau?: string | null
          responsavel?: string | null
          segredo_justica?: boolean | null
          situacao?: Database["public"]["Enums"]["situacao_processo"] | null
          status?: string
          status_1_grau?: string | null
          status_2_grau?: string | null
          status_pagamento_honorarios?: string | null
          status_processual?: string | null
          tipo_processo?: string | null
          uf?: string | null
          updated_at?: string
          valor_acordo?: number | null
          valor_causa?: number | null
          valor_execucao?: number | null
          valor_sentenca?: number | null
        }
        Update: {
          acordao_decisao?: string | null
          adverso?: string | null
          area_atuacao?: string | null
          assunto?: string | null
          assunto_id?: string | null
          camara_turma?: string | null
          capturar_andamentos?: boolean | null
          cliente_id?: string
          comarca?: string | null
          comarca_id?: string | null
          contingencia?: number | null
          created_at?: string
          created_by?: string | null
          data_acordao?: string | null
          data_contratacao?: string | null
          data_distribuicao?: string | null
          data_encerramento?: string | null
          data_execucao?: string | null
          data_sentenca?: string | null
          data_transito_julgado?: string | null
          data_ultima_movimentacao?: string | null
          detalhes?: string | null
          escavador_id?: string | null
          etiqueta?: string | null
          fase?: string | null
          fase_id?: string | null
          grupo?: string | null
          grupo_acao?: string | null
          grupo_cliente?: string | null
          honorarios_percentual?: number | null
          id?: string
          juiz_1_grau?: string | null
          local_tramite?: string | null
          localizador?: string | null
          numero_antigo?: string | null
          numero_cnj?: string | null
          numero_processo?: string | null
          objeto_acao?: string | null
          observacao?: string | null
          observacoes?: string | null
          origem?: string | null
          outro_valor?: number | null
          parceiro?: string | null
          partes_requeridas?: string | null
          pasta?: string | null
          pedido?: string | null
          processo_pai_id?: string | null
          prognostico?:
            | Database["public"]["Enums"]["prognostico_processo"]
            | null
          relator_2_grau?: string | null
          responsavel?: string | null
          segredo_justica?: boolean | null
          situacao?: Database["public"]["Enums"]["situacao_processo"] | null
          status?: string
          status_1_grau?: string | null
          status_2_grau?: string | null
          status_pagamento_honorarios?: string | null
          status_processual?: string | null
          tipo_processo?: string | null
          uf?: string | null
          updated_at?: string
          valor_acordo?: number | null
          valor_causa?: number | null
          valor_execucao?: number | null
          valor_sentenca?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_assunto_id_fkey"
            columns: ["assunto_id"]
            isOneToOne: false
            referencedRelation: "aux_assuntos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_comarca_id_fkey"
            columns: ["comarca_id"]
            isOneToOne: false
            referencedRelation: "aux_comarcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "aux_fases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_processo_pai_id_fkey"
            columns: ["processo_pai_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          status: Database["public"]["Enums"]["approval_status"]
          theme_color: string
          theme_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          theme_color?: string
          theme_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          theme_color?: string
          theme_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      publicacoes: {
        Row: {
          caderno: string | null
          cliente_id: string | null
          conteudo: string | null
          created_at: string | null
          data_publicacao: string | null
          id: string
          instancia: string | null
          lido_em: string | null
          numero_processo: string | null
          orgao: string | null
          status_leitura: string | null
          tipo_publicacao: string | null
          tribunal: string | null
        }
        Insert: {
          caderno?: string | null
          cliente_id?: string | null
          conteudo?: string | null
          created_at?: string | null
          data_publicacao?: string | null
          id?: string
          instancia?: string | null
          lido_em?: string | null
          numero_processo?: string | null
          orgao?: string | null
          status_leitura?: string | null
          tipo_publicacao?: string | null
          tribunal?: string | null
        }
        Update: {
          caderno?: string | null
          cliente_id?: string | null
          conteudo?: string | null
          created_at?: string | null
          data_publicacao?: string | null
          id?: string
          instancia?: string | null
          lido_em?: string | null
          numero_processo?: string | null
          orgao?: string | null
          status_leitura?: string | null
          tipo_publicacao?: string | null
          tribunal?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          bucket_path: string
          created_at: string
          file_path: string
          id: string
          is_active: boolean
          name: string
          uploaded_by: string | null
        }
        Insert: {
          bucket_path: string
          created_at?: string
          file_path: string
          id?: string
          is_active?: boolean
          name: string
          uploaded_by?: string | null
        }
        Update: {
          bucket_path?: string
          created_at?: string
          file_path?: string
          id?: string
          is_active?: boolean
          name?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_approval_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["approval_status"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      approval_status: "pending" | "approved" | "rejected" | "suspended"
      prognostico_processo: "Procedente" | "Improcedente" | "Parcial" | "Acordo"
      situacao_processo: "Ativo" | "Inativo" | "Suspenso"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      approval_status: ["pending", "approved", "rejected", "suspended"],
      prognostico_processo: ["Procedente", "Improcedente", "Parcial", "Acordo"],
      situacao_processo: ["Ativo", "Inativo", "Suspenso"],
    },
  },
} as const
